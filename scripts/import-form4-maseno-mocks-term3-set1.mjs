import crypto from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

const defaultSourcePath = "C:\\Users\\Eric\\Downloads\\MASENO MOCK 2026";
const sourcePath = process.argv.slice(2).find((arg) => !arg.startsWith("--")) || defaultSourcePath;
const dryRun = process.argv.includes("--dry-run");

const folderSubjectNames = new Map([
  ["AGRIC", "Agriculture"],
  ["AVIATION", "Aviation"],
  ["BIOLOGY", "Biology"],
  ["BST", "Business Studies"],
  ["CHEMISTRY", "Chemistry"],
  ["COMP", "Computer Studies"],
  ["CRE", "CRE"],
  ["ENGLISH", "English"],
  ["FRENCH", "French"],
  ["GEOG", "Geography"],
  ["GERMAN", "German"],
  ["HISTORY", "History"],
  ["KISW", "Kiswahili"],
  ["MATHS", "Mathematics"],
  ["PHYSICS", "Physics"]
]);

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
  r2Config.accountId &&
    r2Config.accessKeyId &&
    r2Config.secretAccessKey &&
    r2Config.bucket &&
    r2Config.publicBaseUrl
);

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

async function listFiles(folderPath) {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

async function getSubjectFolders() {
  const entries = await fs.readdir(sourcePath, { withFileTypes: true });
  const folders = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const subject = folderSubjectNames.get(entry.name.toUpperCase());
    if (!subject) {
      console.warn(`Skipping unknown subject folder: ${entry.name}`);
      continue;
    }

    const folderPath = path.join(sourcePath, entry.name);
    const files = await listFiles(folderPath);
    if (files.length === 0) {
      console.warn(`Skipping empty subject folder: ${entry.name}`);
      continue;
    }

    folders.push({
      folderName: entry.name,
      folderPath,
      subject,
      files
    });
  }

  return folders.sort((a, b) => a.subject.localeCompare(b.subject));
}

async function getAdminUserId(supabase) {
  if (process.env.UPLOADED_BY_USER_ID) {
    return process.env.UPLOADED_BY_USER_ID;
  }

  const preferredAdminEmail = process.env.ADMIN_EMAIL || "ericdavid348@gmail.com";
  const preferred = await supabase.from("users").select("id").eq("email", preferredAdminEmail).maybeSingle();
  if (preferred.error) throw new Error(preferred.error.message);
  if (preferred.data?.id) return preferred.data.id;

  const fallback = await supabase.from("users").select("id").eq("role", "admin").limit(1).maybeSingle();
  if (fallback.error) throw new Error(fallback.error.message);
  if (fallback.data?.id) return fallback.data.id;

  throw new Error("Could not find an admin user to attach as uploaded_by_user_id.");
}

function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2Config.accessKeyId,
      secretAccessKey: r2Config.secretAccessKey
    }
  });
}

async function uploadFile(supabase, filePath, buffer) {
  if (r2Ready) {
    const client = getR2Client();
    await client.send(
      new PutObjectCommand({
        Bucket: r2Config.bucket,
        Key: filePath,
        Body: buffer,
        ContentType: "application/zip"
      })
    );
    return `${r2Config.publicBaseUrl}/${filePath}`;
  }

  const { error } = await supabase.storage.from(supabaseBucket).upload(filePath, buffer, {
    contentType: "application/zip",
    upsert: false
  });

  if (error) throw new Error(error.message);
  return supabase.storage.from(supabaseBucket).getPublicUrl(filePath).data.publicUrl;
}

async function retry(task, label, attempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      console.warn(`${label} failed on attempt ${attempt}; retrying...`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
    }
  }

  throw lastError;
}

async function main() {
  const subjectFolders = await getSubjectFolders();
  const planned = subjectFolders.map((folder) => ({
    ...folder,
    title: `MASENO MOCKS - Form 4 ${folder.subject} Term 3.zip`,
    fileName: `MASENO MOCKS - Form 4 ${folder.subject} Term 3.zip`
  }));

  console.table(
    planned.map((item) => ({
      subject: item.subject,
      title: item.title,
      files: item.files.length
    }))
  );

  if (dryRun) {
    console.log(`DRY RUN: ${planned.length} MASENO MOCKS Form 4 Term 3 Set 1 bundles planned.`);
    return;
  }

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const uploadedByUserId = await getAdminUserId(supabase);
  const existing = await supabase
    .from("resources")
    .select("file_name")
    .eq("level", "Form 4")
    .eq("category", "revision-material")
    .eq("section", "assessment")
    .eq("term", "term-3")
    .eq("assessment_set", "set-1")
    .in(
      "file_name",
      planned.map((item) => item.fileName)
    );

  if (existing.error) throw new Error(existing.error.message);
  const existingFileNames = new Set((existing.data || []).map((row) => row.file_name));

  let uploaded = 0;
  let skippedExisting = 0;

  for (const item of planned) {
    if (existingFileNames.has(item.fileName)) {
      skippedExisting += 1;
      console.log(`Skipping existing bundle: ${item.fileName}`);
      continue;
    }

    const outputZip = new JSZip();
    for (const filePath of item.files) {
      const relativePath = path.relative(item.folderPath, filePath).replace(/\\/g, "/");
      outputZip.file(relativePath, await fs.readFile(filePath));
    }

    console.log(`Preparing bundle: ${item.fileName}`);
    const bundleBuffer = await outputZip.generateAsync({
      type: "nodebuffer",
      compression: "STORE"
    });

    const storagePath = `materials/form-4/assessments/2026-term-3-set-1-maseno-mocks/${Date.now()}-${slugify(
      item.fileName
    )}`;
    const fileUrl = await retry(() => uploadFile(supabase, storagePath, bundleBuffer), `Upload ${item.fileName}`);

    const now = new Date().toISOString();
    const record = {
      id: createId("resource"),
      title: item.title,
      description: `MASENO MOCKS Form 4 Term 3 Set 1 assessment bundle for ${item.subject}.`,
      level: "Form 4",
      subject: item.subject,
      category: "revision-material",
      section: "assessment",
      assessment_set: "set-1",
      term: "term-3",
      audience: "both",
      price: null,
      file_name: item.fileName,
      file_path: storagePath,
      file_url: fileUrl,
      mime_type: "application/zip",
      uploaded_by_user_id: uploadedByUserId,
      created_at: now,
      updated_at: now
    };

    const insert = await retry(() => supabase.from("resources").insert(record), `Save metadata ${item.fileName}`);
    if (insert.error) throw new Error(insert.error.message);

    uploaded += 1;
    console.log(`Uploaded ${item.title} -> Form 4 / Term 3 / Set 1`);
  }

  console.log(`Completed. Uploaded ${uploaded} bundles. Skipped ${skippedExisting} existing bundles.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
