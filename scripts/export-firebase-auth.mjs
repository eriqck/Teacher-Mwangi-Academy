import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const defaultOutputPath = path.join(process.cwd(), "outputs", "firebase-auth-users.json");

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
  const createdAt = Date.parse(user.createdAt || "") || Date.now();

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
    }),
    metadata: {
      createdAt: `${createdAt}`
    }
  };
}

async function main() {
  loadLocalEnv();
  const options = parseArgs();
  const sourceUsers = (await readUsersFromSupabase()) || (await readUsersFromLocalStore());

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
