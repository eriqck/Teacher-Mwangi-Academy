import crypto from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

const dryRun = process.argv.includes("--dry-run");

const imports = [
  {
    sourcePath: "C:\\Users\\Eric\\Downloads\\2026 KCSE PREDICTOR 1 MASTER PACK.checked",
    titlePrefix: "2026 KCSE Predictor 1",
    level: "Form 4",
    term: "term-3",
    assessmentSet: "set-1",
    storageSegment: "2026-term-3-set-1-predictor-1"
  },
  {
    sourcePath: "C:\\Users\\Eric\\Downloads\\2026 KCSE PREDICTOR 2 MASTER PACK.checked",
    titlePrefix: "2026 KCSE Predictor 2",
    level: "Form 4",
    term: "term-3",
    assessmentSet: "set-2",
    storageSegment: "2026-term-3-set-2-predictor-2"
  },
  {
    sourcePath: "C:\\Users\\Eric\\Downloads\\2026 KCSE PREDICTOR 3 MASTER PACK",
    titlePrefix: "2026 KCSE Predictor 3",
    level: "Form 4",
    term: "term-3",
    assessmentSet: "set-3",
    storageSegment: "2026-term-3-set-3-predictor-3"
  },
  {
    sourcePath: "C:\\Users\\Eric\\Downloads\\form 3 CEKENAS",
    titlePrefix: "CEKENA Exams",
    level: "Form 3",
    term: "term-3",
    assessmentSet: "cekena-exams",
    storageSegment: "2026-term-3-cekena-exams"
  }
];

const subjectRules = [
  [/\bAGR\b|\bAGRIC\b|AGRICULTURE|443/i, "Agriculture"],
  [/ART AND DESIGN/i, "Art and Design"],
  [/AVIATION/i, "Aviation"],
  [/\bBIO\b|BIOLOGY|231/i, "Biology"],
  [/BUILDING AND CONSTRUCTION/i, "Building and Construction"],
  (fileName) => (/\bBST\b|BUSINESS/i.test(fileName) ? "Business Studies" : null),
  [/\bCRE\b|\bC\.?\s*R\.?\s*E\b|CHRISTIAN RELIGIOUS EDUCATION|313/i, "CRE"],
  [/\bCHEM\b|CHEMISTRY|233/i, "Chemistry"],
  [/\bCOMP\b|COMPUTER|451/i, "Computer Studies"],
  [/DRAWING[$\s]*DESIGN|DRAWING AND DESIGN|449/i, "Drawing and Design"],
  [/ELECTRICITY|448/i, "Electricity"],
  [/\bENG\b|ENGLISH|101/i, "English"],
  [/FRENCH|501/i, "French"],
  [/\bGEO\b|GEOG|GEOGRAPHY|312/i, "Geography"],
  [/GERMAN/i, "German"],
  [/\bHIST\b|HISTORY/i, "History"],
  [/HOME\s*SCIENCE|HOMESCIENCE|\bH\s*SCIE\b|\bHSC\b/i, "Home Science"],
  [/KISW|KISWAHILI|KIWAHILI|102/i, "Kiswahili"],
  [/\bMATH|MATHEMATICS|MATHEMMATICS|121/i, "Mathematics"],
  [/MUSIC/i, "Music"],
  [/\bPHY\b|\bPHYS\b|PHYSICS|PHYISICS|232/i, "Physics"]
];

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

function getSubject(fileName) {
  for (const rule of subjectRules) {
    if (typeof rule === "function") {
      const subject = rule(fileName);
      if (subject) return subject;
      continue;
    }

    const [pattern, subject] = rule;
    if (pattern.test(fileName)) return subject;
  }

  return null;
}

async function listFiles(folderPath) {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.toUpperCase() === "RAEL") continue;
      files.push(...(await listFiles(fullPath)));
      continue;
    }

    if (
      entry.isFile() &&
      !entry.name.startsWith("~$") &&
      !/\.tmp$/i.test(entry.name) &&
      /\.(doc|docx|pdf|rtf|zip)$/i.test(entry.name)
    ) {
      files.push(fullPath);
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

async function planImport(importConfig) {
  if (!fsSync.existsSync(importConfig.sourcePath)) {
    console.warn(`Missing source folder: ${importConfig.sourcePath}`);
    return [];
  }

  const files = await listFiles(importConfig.sourcePath);
  const groups = new Map();
  const skipped = [];

  for (const filePath of files) {
    const fileName = path.basename(filePath);
    const subject = getSubject(fileName);
    if (!subject) {
      skipped.push(fileName);
      continue;
    }

    const group = groups.get(subject) || {
      ...importConfig,
      subject,
      files: []
    };
    group.files.push(filePath);
    groups.set(subject, group);
  }

  if (skipped.length > 0) {
    console.log(`Skipped in ${path.basename(importConfig.sourcePath)}:`);
    for (const fileName of skipped) console.log(`- ${fileName}`);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      title: `${group.titlePrefix} - ${group.level} ${group.subject} Term 3.zip`,
      fileName: `${group.titlePrefix} - ${group.level} ${group.subject} Term 3.zip`
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject));
}

async function getAdminUserId(supabase) {
  if (process.env.UPLOADED_BY_USER_ID) return process.env.UPLOADED_BY_USER_ID;

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
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
  throw lastError;
}

async function buildZip(item) {
  const outputZip = new JSZip();
  for (const filePath of item.files) {
    outputZip.file(path.basename(filePath), await fs.readFile(filePath));
  }
  return outputZip.generateAsync({ type: "nodebuffer", compression: "STORE" });
}

async function main() {
  const planned = (await Promise.all(imports.map(planImport))).flat();
  console.table(
    planned.map((item) => ({
      level: item.level,
      set: item.assessmentSet,
      subject: item.subject,
      title: item.title,
      files: item.files.length
    }))
  );

  if (dryRun) {
    console.log(`DRY RUN: ${planned.length} bundles planned. No upload performed.`);
    return;
  }

  if (!supabaseUrl || !supabaseKey) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const uploadedByUserId = await getAdminUserId(supabase);

  let uploaded = 0;
  let skippedExisting = 0;

  for (const item of planned) {
    const existing = await supabase
      .from("resources")
      .select("id")
      .eq("level", item.level)
      .eq("category", "revision-material")
      .eq("section", "assessment")
      .eq("term", item.term)
      .eq("assessment_set", item.assessmentSet)
      .eq("file_name", item.fileName)
      .maybeSingle();

    if (existing.error) throw new Error(existing.error.message);
    if (existing.data?.id) {
      skippedExisting += 1;
      console.log(`Skipping existing bundle: ${item.fileName}`);
      continue;
    }

    console.log(`Preparing bundle: ${item.fileName}`);
    const bundleBuffer = await buildZip(item);
    const storagePath = `materials/${slugify(item.level)}/assessments/${item.storageSegment}/${Date.now()}-${slugify(
      item.fileName
    )}`;
    const fileUrl = await retry(() => uploadFile(supabase, storagePath, bundleBuffer), `Upload ${item.fileName}`);

    const now = new Date().toISOString();
    const record = {
      id: createId("resource"),
      title: item.title,
      description: `${item.titlePrefix} ${item.level} Term 3 assessment bundle for ${item.subject}.`,
      level: item.level,
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
      mime_type: "application/zip",
      uploaded_by_user_id: uploadedByUserId,
      created_at: now,
      updated_at: now
    };

    const insert = await retry(() => supabase.from("resources").insert(record), `Save metadata ${item.fileName}`);
    if (insert.error) throw new Error(insert.error.message);

    uploaded += 1;
    console.log(`Uploaded ${item.title} -> ${item.level} / Term 3 / ${item.assessmentSet}`);
  }

  console.log(`Completed. Uploaded ${uploaded} bundles. Skipped ${skippedExisting} existing bundles.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
