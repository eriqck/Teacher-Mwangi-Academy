import crypto from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

const sourceRoot = "C:\\Users\\Eric\\Documents\\New project\\grade10-strand-files-v2";
const dryRun = process.argv.includes("--dry-run");
const quiet = process.argv.includes("--quiet");

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fsSync.existsSync(envPath)) return;
  for (const line of fsSync.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const separator = line.indexOf("=");
    if (separator < 1 || line.trimStart().startsWith("#")) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadLocalEnv();

const subjectByFolder = {
  agriculture: "Agriculture",
  "aviation-technology": "Aviation Technology",
  biology: "Biology",
  "business-studies": "Business Studies",
  cre: "CRE",
  "electrical-technology": "Electrical Technology",
  english: "English",
  geography: "Geography",
  "history-and-citizenship": "History and Citizenship"
};

const r2Config = {
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET,
  publicBaseUrl: process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "")
};

function slugify(value) {
  return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function displayTitle(fileName) {
  return path.parse(fileName).name.replace(/\s+/g, " ").trim();
}

async function listPlan() {
  const plan = [];
  for (const [folder, subject] of Object.entries(subjectByFolder)) {
    const fullFolder = path.join(sourceRoot, folder);
    const entries = await fs.readdir(fullFolder, { withFileTypes: true });
    for (const entry of entries.filter((candidate) => candidate.isFile() && /\.docx$/i.test(candidate.name))) {
      plan.push({
        fullPath: path.join(fullFolder, entry.name),
        fileName: entry.name,
        subject,
        title: displayTitle(entry.name)
      });
    }
  }
  return plan.sort((left, right) => left.fileName.localeCompare(right.fileName));
}

function r2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: r2Config.accessKeyId, secretAccessKey: r2Config.secretAccessKey }
  });
}

async function adminId(supabase) {
  const result = await supabase
    .from("users")
    .select("id")
    .eq("email", process.env.ADMIN_EMAIL || "ericdavid348@gmail.com")
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if (!result.data?.id) throw new Error("Admin user was not found.");
  return result.data.id;
}

async function main() {
  const plan = await listPlan();
  if (!quiet) console.table(plan.map((item) => ({ subject: item.subject, file: item.fileName })));
  if (plan.length !== 66) throw new Error(`Expected 66 strand files but found ${plan.length}.`);
  if (dryRun) return;

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !Object.values(r2Config).every(Boolean)) {
    throw new Error("Supabase and R2 configuration are required.");
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const uploadedByUserId = await adminId(supabase);
  const r2 = r2Client();
  let uploaded = 0;
  let skipped = 0;

  for (const item of plan) {
    const existing = await supabase
      .from("resources")
      .select("id")
      .eq("level", "Grade 10")
      .eq("section", "assessment")
      .eq("term", "term-3")
      .eq("assessment_set", "strand-based-assessments")
      .eq("file_name", item.fileName)
      .limit(1);
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data?.length) {
      skipped += 1;
      console.log(`Skipping existing: ${item.fileName}`);
      continue;
    }

    const storagePath = `materials/grade-10/assessment/2026-term-3-strand-based/${Date.now()}-${slugify(item.fileName)}`;
    await r2.send(new PutObjectCommand({
      Bucket: r2Config.bucket,
      Key: storagePath,
      Body: await fs.readFile(item.fullPath),
      ContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    }));
    const now = new Date().toISOString();
    const saved = await supabase.from("resources").insert({
      id: `resource_${crypto.randomUUID()}`,
      title: item.title,
      description: `Grade 10 ${item.subject} strand-based assessment material for Term 3.`,
      level: "Grade 10",
      subject: item.subject,
      category: "revision-material",
      section: "assessment",
      assessment_set: "strand-based-assessments",
      term: "term-3",
      audience: "both",
      price: null,
      file_name: item.fileName,
      file_path: storagePath,
      file_url: `${r2Config.publicBaseUrl}/${storagePath}`,
      mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      uploaded_by_user_id: uploadedByUserId,
      created_at: now,
      updated_at: now
    });
    if (saved.error) throw new Error(saved.error.message);
    uploaded += 1;
    console.log(`Uploaded: ${item.subject} / ${item.fileName}`);
  }

  // The completed migration makes the previously hidden Set 3 records redundant.
  const removed = await supabase
    .from("resources")
    .delete()
    .eq("level", "Grade 10")
    .eq("section", "assessment")
    .eq("term", "term-3")
    .eq("assessment_set", "set-3");
  if (removed.error) throw new Error(`The strand files were uploaded, but old Set 3 records could not be removed: ${removed.error.message}`);

  console.log(`Completed. Uploaded ${uploaded}, skipped ${skipped}, and removed the former Grade 10 Term 3 Set 3 records.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
