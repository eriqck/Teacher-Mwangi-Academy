import fs from "fs/promises";
import path from "path";

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("Usage: npm run make-admin -- you@example.com");
  process.exit(1);
}

const storePath = path.join(process.cwd(), "data", "store.json");
const raw = await fs.readFile(storePath, "utf8");
const store = JSON.parse(raw);
const user = store.users.find((entry) => entry.email.toLowerCase() === email);

if (!user) {
  console.error(`No user found with email: ${email}`);
  process.exit(1);
}

user.role = "admin";

await fs.writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
console.log(`Promoted ${email} to admin.`);
