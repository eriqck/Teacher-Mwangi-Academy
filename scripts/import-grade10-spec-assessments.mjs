import crypto from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

const defaultSourcePath = "C:\\Users\\Eric\\Documents\\New project\\grade10-spec-extracted";
const sourcePath = process.argv.slice(2).find((arg) => !arg.startsWith("--")) || defaultSourcePath;
const dryRun = process.argv.includes("--dry-run");

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

const subjectRules = [
  [/AGRIC|AGRICULTURE/, "Agriculture & Nutrition"],
  [/BIOLOGY/, "Biology"],
  [/BUSINESS/, "Business Studies"],
  [/C\.?R\.?E|CRE\b/, "Religious Education"],
  [/IRE\b|ISLAMIC/, "Islamic Religious Education"],
  [/CHEM|CHEMISTRY/, "Chemistry"],
  [/COMPUTER/, "Computer Studies"],
  [/CORE\s*MATH|CORE\s*MATHEMATICS/, "Core Mathematics"],
  [/ESSENTIAL\s*MATH|ESSENTIAL\s*MATHEMATICS|ESSENTIAL\b/, "Essential Mathematics"],
  [/CSL\b/, "Community Service Learning"],
  [/ENGLISH/, "English"],
  [/FASIHI/, "Fasihi"],
  [/GEOG|GEOGRAPHY/, "Geography"],
  [/HISTO|HISTORY/, "History & Citizenship"],
  [/KISWAHILI/, "Kiswahili"],
  [/LITERATURE/, "Literature in English"],
  [/PHYSICS/, "Physics"]
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

function inferSubject(fileName) {
  const upper = fileName.toUpperCase();
  const match = subjectRules.find(([pattern]) => pattern.test(upper));
  return match?.[1] ?? null;
}

function isDocx(fileName) {
  return /\.docx$/i.test(fileName);
}

function isPdf(fileName) {
  return /\.pdf$/i.test(fileName);
}

function getMimeType(fileName) {
  if (/\.zip$/i.test(fileName)) return "application/zip";
  if (/\.docx$/i.test(fileName)) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (/\.pdf$/i.test(fileName)) return "application/pdf";
  return "application/octet-stream";
}

function classify(entryName) {
  const fileName = path.basename(entryName);
  const subject = inferSubject(fileName);

  if (!subject) {
    return null;
  }

  if (isDocx(fileName)) {
    return {
      subject,
      group: "midterm",
      term: "term-2",
      assessmentSet: "set-3",
      label: "Midterm 2"
    };
  }

  if (isPdf(fileName)) {
    return {
      subject,
      group: "endterm",
      term: "term-3",
      assessmentSet: "set-1",
      label: "Term 3"
    };
  }

  return null;
}

function bucketKeyFor(item) {
  return `${item.group}:${item.subject}`;
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

async function uploadFile(supabase, filePath, buffer, mimeType) {
  if (r2Ready) {
    const client = getR2Client();
    await client.send(
      new PutObjectCommand({
        Bucket: r2Config.bucket,
        Key: filePath,
        Body: buffer,
        ContentType: mimeType
      })
    );
    return `${r2Config.publicBaseUrl}/${filePath}`;
  }

  const { error } = await supabase.storage.from(supabaseBucket).upload(filePath, buffer, {
    contentType: mimeType,
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

async function listSourceFiles(folderPath) {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listSourceFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && /\.(docx|pdf)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

async function main() {
  const sourceFiles = await listSourceFiles(sourcePath);
  const groups = new Map();
  const skipped = [];

  for (const fullPath of sourceFiles) {
    const classification = classify(fullPath);
    if (!classification) {
      skipped.push(fullPath);
      continue;
    }

    const key = bucketKeyFor(classification);
    const current = groups.get(key) || { ...classification, files: [] };
    current.files.push(fullPath);
    groups.set(key, current);
  }

  const planned = [...groups.values()]
    .map((group) => ({
      ...group,
      title:
        group.group === "endterm"
          ? `Grade 10 ${group.subject} Term 3.zip`
          : `Grade 10 ${group.subject} ${group.label} Bundle`,
      fileName:
        group.group === "endterm"
          ? `Grade 10 ${group.subject} Term 3.zip`
          : `Grade 10 ${group.subject} ${group.label} Bundle.zip`
    }))
    .sort((a, b) => `${a.term}${a.assessmentSet}${a.subject}`.localeCompare(`${b.term}${b.assessmentSet}${b.subject}`));

  console.table(
    planned.map((item) => ({
      destination: `${item.term} / ${item.assessmentSet}`,
      title: item.title,
      files: item.files.length
    }))
  );

  if (skipped.length > 0) {
    console.log("Skipped files without a clear subject:");
    for (const item of skipped) console.log(`- ${item}`);
  }

  if (dryRun) {
    console.log(`DRY RUN: ${planned.length} subject bundles planned. No upload performed.`);
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
    .eq("level", "Grade 10")
    .eq("category", "revision-material")
    .eq("section", "assessment")
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
    for (const fileEntryName of item.files.sort((a, b) => a.localeCompare(b))) {
      outputZip.file(path.basename(fileEntryName), await fs.readFile(fileEntryName));
    }

    const bundleBuffer = await outputZip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    });

    const storagePath = `materials/grade-10/assessments/2026-${item.term}-${item.assessmentSet}/${Date.now()}-${slugify(
      item.fileName
    )}`;
    const mimeType = getMimeType(item.fileName);
    const fileUrl = await retry(
      () => uploadFile(supabase, storagePath, bundleBuffer, mimeType),
      `Upload ${item.fileName}`
    );

    const now = new Date().toISOString();
    const record = {
      id: createId("resource"),
      title: item.title,
      description: `${item.label} assessment bundle for Grade 10 ${item.subject}. Includes available question paper and marking scheme files.`,
      level: "Grade 10",
      subject: item.subject,
      category: "revision-material",
      section: "assessment",
      assessment_set: item.assessmentSet,
      term: item.term,
      audience: "both",
      price: null,
      file_name: item.fileName,
      file_path: storagePath,
      file_url: fileUrl,
      mime_type: mimeType,
      uploaded_by_user_id: uploadedByUserId,
      created_at: now,
      updated_at: now
    };

    const insert = await retry(() => supabase.from("resources").insert(record), `Save metadata ${item.fileName}`);
    if (insert.error) throw new Error(insert.error.message);

    uploaded += 1;
    console.log(`Uploaded ${item.title} -> ${item.term} / ${item.assessmentSet}`);
  }

  console.log(`Completed. Uploaded ${uploaded} bundles. Skipped ${skippedExisting} existing bundles.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
