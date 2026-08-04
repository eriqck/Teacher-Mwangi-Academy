import { createGunzip } from "zlib";
import { createReadStream, promises as fs } from "fs";
import path from "path";
import readline from "readline";

const [, , backupPath, outputPath = "firebase-auth-users.json", limitArg] = process.argv;
const limit = limitArg ? Number(limitArg) : null;

if (!backupPath) {
  console.error("Usage: node scripts/export-firebase-auth.mjs <db-backup.gz> [output.json] [limit]");
  process.exit(1);
}

if (limit !== null && (!Number.isInteger(limit) || limit < 1)) {
  console.error("The optional limit must be a positive whole number.");
  process.exit(1);
}

const copyNull = "\\N";

function decodeCopyValue(value) {
  if (value === copyNull) {
    return null;
  }

  return value.replace(/\\([\\bfnrt])/g, (_match, escape) => {
    switch (escape) {
      case "\\":
        return "\\";
      case "b":
        return "\b";
      case "f":
        return "\f";
      case "n":
        return "\n";
      case "r":
        return "\r";
      case "t":
        return "\t";
      default:
        return escape;
    }
  });
}

function toMillis(value) {
  if (!value) {
    return undefined;
  }

  const millis = new Date(value).getTime();
  return Number.isFinite(millis) ? `${millis}` : undefined;
}

function toFirebaseUser(row) {
  const id = row.id?.trim();
  const email = row.email?.trim().toLowerCase();
  const passwordHash = row.password_hash?.trim();
  const passwordSalt = row.password_salt?.trim();

  if (!id || !email || !passwordHash || !passwordSalt) {
    return null;
  }

  return {
    localId: id,
    email,
    emailVerified: false,
    passwordHash: Buffer.from(passwordHash, "hex").toString("base64"),
    salt: Buffer.from(passwordSalt, "utf8").toString("base64"),
    displayName: row.full_name ?? "",
    createdAt: toMillis(row.created_at)
  };
}

async function exportUsers() {
  const users = [];
  const appUserMap = [];
  let capture = false;
  let columns = [];

  const stream = createReadStream(backupPath).pipe(createGunzip());
  const lines = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  });

  for await (const line of lines) {
    const copyMatch = line.match(/^COPY\s+public\.users\s+\(([^)]*)\)\s+FROM\s+stdin;/);

    if (copyMatch) {
      capture = true;
      columns = copyMatch[1].split(",").map((column) => column.trim());
      continue;
    }

    if (!capture) {
      continue;
    }

    if (line === "\\.") {
      break;
    }

    const values = line.split("\t").map(decodeCopyValue);
    const row = Object.fromEntries(columns.map((column, index) => [column, values[index] ?? null]));
    const firebaseUser = toFirebaseUser(row);

    if (!firebaseUser) {
      continue;
    }

    users.push(firebaseUser);
    appUserMap.push({
      oldUserId: row.id,
      email: row.email,
      fullName: row.full_name,
      phoneNumber: row.phone_number,
      role: row.role,
      createdAt: row.created_at
    });

    if (limit !== null && users.length >= limit) {
      break;
    }
  }

  const resolvedOutputPath = path.resolve(outputPath);
  const mapOutputPath = resolvedOutputPath.replace(/\.json$/i, ".app-user-map.json");

  await fs.writeFile(resolvedOutputPath, `${JSON.stringify({ users }, null, 2)}\n`, "utf8");
  await fs.writeFile(mapOutputPath, `${JSON.stringify({ users: appUserMap }, null, 2)}\n`, "utf8");

  console.log(`Exported ${users.length} Firebase Auth users to ${resolvedOutputPath}`);
  console.log(`Exported ${appUserMap.length} app user profile records to ${mapOutputPath}`);
  console.log("");
  console.log("Import with:");
  console.log(
    `firebase auth:import "${resolvedOutputPath}" --hash-algo=STANDARD_SCRYPT --mem-cost=16384 --parallelization=1 --block-size=8 --dk-len=64`
  );
}

exportUsers().catch((error) => {
  console.error(error);
  process.exit(1);
});
