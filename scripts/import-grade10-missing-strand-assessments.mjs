import crypto from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

const generatedRoot = "C:\\Users\\Eric\\Documents\\New project\\grade10-missing-strand-files";
const physicsSource = "C:\\Users\\Eric\\Documents\\New project\\grade10-topical-source\\PHYSICS GRADE 10  ANSWER BOOKLET.docx";

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

const r2Config = {
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET,
  publicBaseUrl: process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "")
};

const subjectByFolder = {
  chemistry: "Chemistry",
  "core-mathematics": "Core Mathematics",
  "kiswahili-fasihi": "Kiswahili Fasihi",
  "kiswahili-lugha": "Kiswahili Lugha"
};

function slugify(value) {
  return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function plan() {
  const files = [];
  for (const [folder, subject] of Object.entries(subjectByFolder)) {
    const entries = await fs.readdir(path.join(generatedRoot, folder), { withFileTypes: true });
    for (const entry of entries.filter((candidate) => candidate.isFile() && /\.docx$/i.test(candidate.name))) {
      files.push({ fullPath: path.join(generatedRoot, folder, entry.name), fileName: entry.name, subject });
    }
  }
  files.push({
    fullPath: physicsSource,
    fileName: "Grade 10 Physics Complete Topical Answer Booklet.docx",
    subject: "Physics"
  });
  return files.sort((left, right) => left.fileName.localeCompare(right.fileName));
}

function r2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: r2Config.accessKeyId, secretAccessKey: r2Config.secretAccessKey }
  });
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !Object.values(r2Config).every(Boolean)) {
    throw new Error("Supabase and R2 configuration are required.");
  }
  const items = await plan();
  if (items.length !== 32) throw new Error(`Expected 32 files but found ${items.length}.`);
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const admin = await supabase.from("users").select("id").eq("email", process.env.ADMIN_EMAIL || "ericdavid348@gmail.com").maybeSingle();
  if (admin.error || !admin.data?.id) throw new Error(admin.error?.message || "Admin user was not found.");
  const r2 = r2Client();
  let uploaded = 0;
  let skipped = 0;
  for (const item of items) {
    const existing = await supabase.from("resources").select("id").eq("level", "Grade 10").eq("section", "assessment").eq("assessment_set", "strand-based-assessments").eq("file_name", item.fileName).limit(1);
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data?.length) { skipped += 1; continue; }
    const storagePath = `materials/grade-10/strand-based/${Date.now()}-${slugify(item.fileName)}`;
    await r2.send(new PutObjectCommand({ Bucket: r2Config.bucket, Key: storagePath, Body: await fs.readFile(item.fullPath), ContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));
    const now = new Date().toISOString();
    const saved = await supabase.from("resources").insert({
      id: `resource_${crypto.randomUUID()}`,
      title: path.parse(item.fileName).name,
      description: `Grade 10 ${item.subject} strand-based assessment material.`,
      level: "Grade 10", subject: item.subject, category: "revision-material", section: "assessment",
      assessment_set: "strand-based-assessments", term: null, audience: "both", price: null,
      file_name: item.fileName, file_path: storagePath, file_url: `${r2Config.publicBaseUrl}/${storagePath}`,
      mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      uploaded_by_user_id: admin.data.id, created_at: now, updated_at: now
    });
    if (saved.error) throw new Error(saved.error.message);
    uploaded += 1;
    console.log(`Uploaded: ${item.subject} / ${item.fileName}`);
  }
  const untagged = await supabase.from("resources").update({ term: null }).eq("level", "Grade 10").eq("section", "assessment").eq("assessment_set", "strand-based-assessments");
  if (untagged.error) throw new Error(untagged.error.message);
  console.log(`Completed. Uploaded ${uploaded}, skipped ${skipped}, and removed term tags from Grade 10 strand-based materials.`);
}

main().catch((error) => { console.error(error); process.exit(1); });
