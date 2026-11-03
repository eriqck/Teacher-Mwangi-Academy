import crypto from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

const sourceRoot = "C:\\Users\\Eric\\OneDrive\\Desktop\\Lower Grades";
const dryRun = process.argv.includes("--dry-run");

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

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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

function subjectFor(level, fileName) {
  if (level === "PP1 & PP2") return /\bPP1\b/i.test(fileName) ? "PP1" : "PP2";
  if (/ENGLISH/i.test(fileName)) return "English";
  if (/KISWAHILI/i.test(fileName)) return "Kiswahili";
  if (/MATHEMATICS/i.test(fileName)) return "Mathematics";
  if (/INTEGRATED/i.test(fileName)) return "Integrated Learning Areas";
  return "General Assessment";
}

function assessmentSetFor(fileName) {
  const match = fileName.match(/SET\s*(\d)/i);
  return `set-${match?.[1] ?? "1"}`;
}

function titleFor(fileName) {
  return path.parse(fileName).name.replace(/\s*\(\d+\)/g, "").replace(/\s+/g, " ").trim();
}

function mimeFor(fileName) {
  return /\.pdf$/i.test(fileName)
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

async function filesIn(folder) {
  const entries = await fs.readdir(path.join(sourceRoot, folder), { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /\.(pdf|docx)$/i.test(entry.name))
    .map((entry) => path.join(sourceRoot, folder, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

async function plannedFiles() {
  const folders = [
    { folder: "Grade 1", level: "Grade 1" },
    { folder: "Grade 2", level: "Grade 2" },
    { folder: "Grade 3", level: "Grade 3" },
    { folder: "Pp1 & Pp2", level: "PP1 & PP2" }
  ];
  const planned = [];
  for (const entry of folders) {
    for (const fullPath of await filesIn(entry.folder)) {
      const fileName = path.basename(fullPath);
      planned.push({
        fullPath,
        level: entry.level,
        subject: subjectFor(entry.level, fileName),
        assessmentSet: assessmentSetFor(fileName),
        fileName,
        title: titleFor(fileName)
      });
    }
  }
  return planned;
}

function r2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: r2Config.accessKeyId, secretAccessKey: r2Config.secretAccessKey }
  });
}

async function uploadToR2(storagePath, buffer, contentType) {
  await r2Client().send(new PutObjectCommand({
    Bucket: r2Config.bucket,
    Key: storagePath,
    Body: buffer,
    ContentType: contentType
  }));
  return `${r2Config.publicBaseUrl}/${storagePath}`;
}

async function getAdminId(supabase) {
  const result = await supabase.from("users").select("id").eq("email", process.env.ADMIN_EMAIL || "ericdavid348@gmail.com").maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if (!result.data?.id) throw new Error("Admin user was not found.");
  return result.data.id;
}

async function main() {
  const planned = await plannedFiles();
  console.table(planned.map((item) => ({ level: item.level, set: item.assessmentSet, subject: item.subject, file: item.fileName })));
  if (dryRun) return;
  if (!supabaseUrl || !supabaseKey || !Object.values(r2Config).every(Boolean)) {
    throw new Error("Supabase and R2 configuration are required.");
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const uploadedByUserId = await getAdminId(supabase);
  let uploaded = 0;
  let skipped = 0;

  for (const item of planned) {
    const existing = await supabase
      .from("resources")
      .select("id")
      .eq("level", item.level)
      .eq("category", "revision-material")
      .eq("section", "assessment")
      .eq("term", "term-3")
      .eq("file_name", item.fileName)
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data?.id) {
      skipped += 1;
      console.log(`Skipping existing: ${item.level} / ${item.fileName}`);
      continue;
    }

    const contentType = mimeFor(item.fileName);
    const storagePath = `materials/${slugify(item.level)}/assessment/2026-term-3-${item.assessmentSet}/${Date.now()}-${slugify(item.fileName)}`;
    const fileUrl = await uploadToR2(storagePath, await fs.readFile(item.fullPath), contentType);
    const now = new Date().toISOString();
    const saved = await supabase.from("resources").insert({
      id: `resource_${crypto.randomUUID()}`,
      title: item.title,
      description: `${item.title} assessment for ${item.level}, Term 3 ${item.assessmentSet.replace("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}.`,
      level: item.level,
      subject: item.subject,
      category: "revision-material",
      section: "assessment",
      assessment_set: item.assessmentSet,
      term: "term-3",
      audience: "both",
      price: null,
      file_name: item.fileName,
      file_path: storagePath,
      file_url: fileUrl,
      mime_type: contentType,
      uploaded_by_user_id: uploadedByUserId,
      created_at: now,
      updated_at: now
    });
    if (saved.error) throw new Error(saved.error.message);
    uploaded += 1;
    console.log(`Uploaded: ${item.level} / Term 3 / ${item.assessmentSet} / ${item.subject} / ${item.fileName}`);
  }
  console.log(`Completed. Uploaded ${uploaded} files and skipped ${skipped} existing files.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
