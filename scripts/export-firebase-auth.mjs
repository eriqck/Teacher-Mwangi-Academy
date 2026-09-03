import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { createClient } from "@supabase/supabase-js";

const defaultOutputPath = path.join(process.cwd(), "outputs", "firebase-auth-users.json");
const defaultBackupPath = "C:\\Users\\Eric\\Desktop\\supabase backup\\db_cluster-29-07-2026@08-38-47.backup.gz";

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fsSync.existsSync(envPath)) return;

  const raw = fsSync.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    limit: null,
    role: null,
    email: null,
    output: defaultOutputPath,
    backup: null,
    dryRun: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--limit") {
      options.limit = Number(args[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      options.limit = Number(arg.split("=")[1]);
      continue;
    }

    if (arg === "--role") {
      options.role = args[index + 1]?.trim().toLowerCase() || null;
      index += 1;
      continue;
    }

    if (arg.startsWith("--role=")) {
      options.role = arg.split("=")[1]?.trim().toLowerCase() || null;
      continue;
    }

    if (arg === "--email") {
      options.email = args[index + 1]?.trim().toLowerCase() || null;
      index += 1;
      continue;
    }

    if (arg.startsWith("--email=")) {
      options.email = arg.split("=")[1]?.trim().toLowerCase() || null;
      continue;
    }

    if (arg === "--output") {
      options.output = path.resolve(args[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith("--output=")) {
      options.output = path.resolve(arg.slice("--output=".length));
      continue;
    }

    if (arg === "--backup") {
      options.backup = path.resolve(args[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith("--backup=")) {
      options.backup = path.resolve(arg.slice("--backup=".length));
      continue;
    }
  }

  if (options.limit !== null && (!Number.isInteger(options.limit) || options.limit < 1)) {
    throw new Error("Use a positive whole number for --limit, for example --limit 5.");
  }

  if (options.role && !["parent", "teacher", "admin"].includes(options.role)) {
    throw new Error("Use --role parent, --role teacher, or --role admin.");
  }

  return options;
}

function decodePostgresCopyValue(value) {
  if (value === "\\N") return "";

  return value
    .replace(/\\\\/g, "\\")
    .replace(/\\t/g, "\t")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r");
}

function parseUsersFromSqlDump(sqlDump) {
  const copyPattern =
    /^COPY public\.users \(id, full_name, email, phone_number, role, password_hash, password_salt, created_at\) FROM stdin;$/m;
  const copyMatch = copyPattern.exec(sqlDump);

  if (!copyMatch) {
    throw new Error("Could not find COPY public.users data in the backup.");
  }

  const startIndex = copyMatch.index + copyMatch[0].length;
  const nextSection = sqlDump.slice(startIndex);
  const endIndex = nextSection.search(/\r?\n\\\.\r?\n/);

  if (endIndex === -1) {
    throw new Error("Could not find the end of COPY public.users data in the backup.");
  }

  const copyBody = nextSection.slice(0, endIndex).trim();
  if (!copyBody) return [];

  return copyBody.split(/\r?\n/).map((line) => {
    const [id, fullName, email, phoneNumber, role, , , createdAt] = line
      .split("\t")
      .map((value) => decodePostgresCopyValue(value));

    return {
      id,
      fullName,
      email,
      phoneNumber,
      role,
      createdAt
    };
  });
}

async function readBackupText(backupPath) {
  const backupBuffer = await fs.readFile(backupPath);

  if (/\.gz$/i.test(backupPath)) {
    return zlib.gunzipSync(backupBuffer).toString("utf8");
  }

  return backupBuffer.toString("utf8");
}

async function readUsersFromBackup(backupPath) {
  const backupText = await readBackupText(backupPath);
  return parseUsersFromSqlDump(backupText);
}

function mapSupabaseUser(row) {
  return {
    id: `${row.id}`,
    fullName: `${row.full_name ?? ""}`,
    email: `${row.email ?? ""}`,
    phoneNumber: `${row.phone_number ?? ""}`,
    role: `${row.role ?? ""}`,
    createdAt: `${row.created_at ?? ""}`
  };
}

async function readUsersFromSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { data, error } = await supabase.from("users").select("id,full_name,email,phone_number,role,created_at");
  if (error) throw new Error(`Could not read Supabase users: ${error.message}`);

  return (data || []).map(mapSupabaseUser);
}

async function readUsersFromLocalStore() {
  const storePath = path.join(process.cwd(), "data", "store.json");
  const raw = await fs.readFile(storePath, "utf8");
  const store = JSON.parse(raw);
  return Array.isArray(store.users) ? store.users : [];
}

function toFirebaseUser(user) {
  const email = `${user.email ?? ""}`.trim().toLowerCase();
  const fullName = `${user.fullName ?? ""}`.trim();
  const role = `${user.role ?? ""}`.trim().toLowerCase();

  return {
    localId: `${user.id}`.slice(0, 128),
    email,
    emailVerified: false,
    displayName: fullName || email,
    disabled: false,
    customAttributes: JSON.stringify({
      role,
      legacyUserId: `${user.id}`,
      phoneNumber: `${user.phoneNumber ?? ""}`
    })
  };
}

async function main() {
  loadLocalEnv();
  const options = parseArgs();
  const backupPath = options.backup || (fsSync.existsSync(defaultBackupPath) ? defaultBackupPath : null);
  const sourceUsers = backupPath
    ? await readUsersFromBackup(backupPath)
    : (await readUsersFromSupabase()) || (await readUsersFromLocalStore());

  let users = sourceUsers
    .filter((user) => `${user.email ?? ""}`.trim())
    .sort((left, right) => `${left.email}`.localeCompare(`${right.email}`));

  if (options.role) {
    users = users.filter((user) => `${user.role}`.trim().toLowerCase() === options.role);
  }

  if (options.email) {
    users = users.filter((user) => `${user.email}`.trim().toLowerCase() === options.email);
  }

  if (options.limit) {
    users = users.slice(0, options.limit);
  }

  const firebaseUsers = users.map(toFirebaseUser);
  const exportPayload = { users: firebaseUsers };

  console.table(
    firebaseUsers.map((user) => ({
      uid: user.localId,
      email: user.email,
      displayName: user.displayName,
      claims: user.customAttributes
    }))
  );

  if (options.dryRun) {
    console.log(`DRY RUN: ${firebaseUsers.length} Firebase Auth users prepared. No file written.`);
    return;
  }

  await fs.mkdir(path.dirname(options.output), { recursive: true });
  await fs.writeFile(options.output, `${JSON.stringify(exportPayload, null, 2)}\n`);

  console.log(`Exported ${firebaseUsers.length} users to ${options.output}`);
  console.log("Import test batch with:");
  console.log(`firebase auth:import "${options.output}" --project teacher-mwangi-academy`);
  console.log("After import, send those users Firebase password reset links so they create new passwords.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
