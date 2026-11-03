import crypto from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

const dryRun = process.argv.includes("--dry-run");
const sourceRoot = "C:\\Users\\Eric\\OneDrive\\Desktop\\Lower Grades";

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fsSync.existsSync(envPath)) return;

  for (const line of fsSync.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadLocalEnv();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseBucket = process.env.SUPABASE_STORAGE_BUCKET || "materials";
const r2Config = {
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET,
  publicBaseUrl: process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "")
};
const r2Ready = Boolean(
  r2Config.accountId && r2Config.accessKeyId && r2Config.secretAccessKey && r2Config.bucket && r2Config.publicBaseUrl
);

const subjectRules = [
  [/AGRICULTURE/i, "Agriculture and Nutrition"],
  [/CREATIVE\s+ARTS/i, "Creative Arts"],
  [/\bCRE\b/i, "CRE"],
  [/\bIRE\b/i, "IRE"],
  [/\bHRE\b/i, "HRE"],
  [/ENGLISH/i, "English"],
  [/KISWAHILI/i, "Kiswahili"],
  [/MATHEMATICS/i, "Mathematics"],
  [/SCIENCE[-\s]+AND[-\s]+TECHNOLOGY/i, "Science and Technology"],
  [/SOCIAL\s+STUDIES/i, "Social Studies"],
  [/FRENCH/i, "French"],
  [/GERMAN/i, "German"]
];

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getMimeType(fileName) {
  if (/\.pdf$/i.test(fileName)) return "application/pdf";
  return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

function inferSubject(fileName) {
  return subjectRules.find(([pattern]) => pattern.test(fileName))?.[1] ?? "General Revision";
}

function humanTitle(fileName) {
  return path
    .parse(fileName)
    .name.replace(/\s*\(\d+\)/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\bgrade\b/gi, "Grade");
}

async function listFiles(folderPath) {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /\.(pdf|docx)$/i.test(entry.name))
    .map((entry) => path.join(folderPath, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

async function getAdminUserId(supabase) {
  const email = process.env.ADMIN_EMAIL || "ericdavid348@gmail.com";
  const preferred = await supabase.from("users").select("id").eq("email", email).maybeSingle();
  if (preferred.error) throw new Error(preferred.error.message);
  if (preferred.data?.id) return preferred.data.id;

  const fallback = await supabase.from("users").select("id").eq("role", "admin").limit(1).maybeSingle();
  if (fallback.error) throw new Error(fallback.error.message);
  if (fallback.data?.id) return fallback.data.id;
  throw new Error("Could not find an admin user to attach to the uploads.");
}

function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: r2Config.accessKeyId, secretAccessKey: r2Config.secretAccessKey }
  });
}

async function uploadFile(supabase, storagePath, buffer, mimeType) {
  if (r2Ready) {
    await getR2Client().send(
      new PutObjectCommand({ Bucket: r2Config.bucket, Key: storagePath, Body: buffer, ContentType: mimeType })
    );
    return `${r2Config.publicBaseUrl}/${storagePath}`;
  }

  const result = await supabase.storage.from(supabaseBucket).upload(storagePath, buffer, { contentType: mimeType, upsert: false });
  if (result.error) throw new Error(result.error.message);
  return supabase.storage.from(supabaseBucket).getPublicUrl(storagePath).data.publicUrl;
}

async function retry(task, label, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        console.warn(`${label} failed on attempt ${attempt}; retrying...`);
        await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
      }
    }
  }
  throw lastError;
}

async function planLevel(level) {
  const assessmentFiles = await listFiles(path.join(sourceRoot, level));
  const noteFiles = await listFiles(path.join(sourceRoot, `${level} notes`));

  return [
    ...assessmentFiles.map((fullPath) => ({
      fullPath,
      level,
      section: "assessment",
      assessmentSet: "set-1",
      subject: inferSubject(path.basename(fullPath)),
      title: humanTitle(path.basename(fullPath)),
      description: `${humanTitle(path.basename(fullPath))} assessment for ${level}, Term 3 Set 1.`
    })),
    ...noteFiles.map((fullPath) => ({
      fullPath,
      level,
      section: "notes",
      assessmentSet: null,
      subject: inferSubject(path.basename(fullPath)),
      title: humanTitle(path.basename(fullPath)),
      description: `${humanTitle(path.basename(fullPath))} notes for ${level}, Term 3.`
    }))
  ];
}

async function main() {
  const planned = [...(await planLevel("Grade 4")), ...(await planLevel("Grade 5"))];
  console.table(
    planned.map((item) => ({ level: item.level, type: item.section, set: item.assessmentSet || "Notes", subject: item.subject, file: path.basename(item.fullPath) }))
  );

  if (dryRun) {
    console.log(`DRY RUN: ${planned.length} Grade 4/5 files classified. No upload performed.`);
    return;
  }
  if (!supabaseUrl || !supabaseKey) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const uploadedByUserId = await getAdminUserId(supabase);
  let uploaded = 0;
  let skipped = 0;

  for (const item of planned) {
    const fileName = path.basename(item.fullPath);
    const existing = await supabase
      .from("resources")
      .select("id")
      .eq("level", item.level)
      .eq("category", "revision-material")
      .eq("section", item.section)
      .eq("term", "term-3")
      .eq("file_name", fileName)
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data?.id) {
      skipped += 1;
      console.log(`Skipping existing: ${item.level} / ${fileName}`);
      continue;
    }

    const mimeType = getMimeType(fileName);
    const storagePath = `materials/${slugify(item.level)}/${item.section}/2026-term-3-${item.assessmentSet || "notes"}/${Date.now()}-${slugify(fileName)}`;
    const fileUrl = await retry(
      async () => uploadFile(supabase, storagePath, await fs.readFile(item.fullPath), mimeType),
      `Upload ${fileName}`
    );
    const now = new Date().toISOString();
    const record = {
      id: createId("resource"),
      title: item.title,
      description: item.description,
      level: item.level,
      subject: item.subject,
      category: "revision-material",
      section: item.section,
      assessment_set: item.assessmentSet,
      term: "term-3",
      audience: "both",
      price: null,
      file_name: fileName,
      file_path: storagePath,
      file_url: fileUrl,
      mime_type: mimeType,
      uploaded_by_user_id: uploadedByUserId,
      created_at: now,
      updated_at: now
    };
    const inserted = await retry(() => supabase.from("resources").insert(record), `Save metadata ${fileName}`);
    if (inserted.error) throw new Error(inserted.error.message);
    uploaded += 1;
    console.log(`Uploaded: ${item.level} / Term 3 / ${item.section === "assessment" ? "Set 1" : "Notes"} / ${item.subject} / ${fileName}`);
  }

  console.log(`Completed. Uploaded ${uploaded} files and skipped ${skipped} existing files.`);
}

main().catch((error) => {
  // Preserve the underlying network cause when an external storage or database call fails.
  console.error(error);
  process.exit(1);
});
