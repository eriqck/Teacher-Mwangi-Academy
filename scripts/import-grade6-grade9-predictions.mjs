import crypto from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

const dryRun = process.argv.includes("--dry-run");
const finalKjseaMode = process.argv.includes("--grade9-final-kjsea");
const sourcePath = process.argv.slice(2).find((arg) => !arg.startsWith("--"));

const grade6Path = "C:\\Users\\Eric\\Documents\\grade 6 and 9\\Grade 6";
const grade9Path = finalKjseaMode
  ? sourcePath || "C:\\Users\\Eric\\Documents\\Teacher Mwangi\\Grade 9 KJSEA"
  : "C:\\Users\\Eric\\Documents\\grade 6 and 9";

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

const grade6Subjects = [
  [/Creative Arts/i, "Creative Arts"],
  [/English/i, "English"],
  [/Intergrated Science|Integrated Science/i, "Integrated Science"],
  [/Kiswahili/i, "Kiswahili"],
  [/Social Studies/i, "Social Studies"]
];

const grade9Subjects = [
  [/AGRICULTURE|AGRIC/i, "Agriculture"],
  [/CREATIVE ARTS/i, "Creative Arts"],
  [/\bCRE\b/i, "Religious Education"],
  [/\bCAS\b/i, "Creative Arts and Sports"],
  [/ENG(?:LISH)?(?:\s+PP)?/i, "English"],
  [/INT(?:EGRATED)?[_ ]SCIENCE|INTER[_ ]SC/i, "Integrated Science"],
  [/KISWAHILI|KIS(?:WAHILI)?\s+PP/i, "Kiswahili"],
  [/MATHEMATICS|\bMATHS?\b/i, "Mathematics"],
  [/PRE-?TEC(?:H)?(?:NICAL)?/i, "Pre-Technical Studies"],
  [/\bSST\b/i, "Social Studies"]
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

function inferSubject(fileName, rules) {
  return rules.find(([pattern]) => pattern.test(fileName))?.[1] ?? null;
}

function normalizeDuplicateName(fileName) {
  return fileName
    .replace(/\s+\(\d+\)(?=\.)/, "")
    .replace(/\s+(?=\.)/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function listFiles(folderPath) {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!/\.pdf$/i.test(entry.name)) continue;
    files.push(path.join(folderPath, entry.name));
  }

  return files.sort((a, b) => a.localeCompare(b));
}

async function planGrade6() {
  const files = await listFiles(grade6Path);
  const markingScheme = files.find((filePath) => /Marking Scheme/i.test(path.basename(filePath)));
  const groups = new Map();

  for (const filePath of files) {
    const fileName = path.basename(filePath);
    if (/Marking Scheme/i.test(fileName)) continue;

    const subject = inferSubject(fileName, grade6Subjects);
    if (!subject) {
      console.warn(`Skipping unknown Grade 6 file: ${fileName}`);
      continue;
    }

    const group = groups.get(subject) || {
      level: "Grade 6",
      subject,
      titlePrefix: "KPSEA Prediction Set 1",
      assessmentSet: "set-1",
      storageSegment: "2026-term-3-set-1-kpsea-prediction",
      files: []
    };

    if (!group.files.some((existingPath) => normalizeDuplicateName(path.basename(existingPath)) === normalizeDuplicateName(fileName))) {
      group.files.push(filePath);
    }
    groups.set(subject, group);
  }

  if (markingScheme) {
    for (const group of groups.values()) group.files.push(markingScheme);
  }

  return [...groups.values()].map((group) => ({
    ...group,
    term: "term-3",
    fileName: `${group.titlePrefix} - ${group.level} ${group.subject} Term 3.zip`,
    title: `${group.titlePrefix} - ${group.level} ${group.subject} Term 3.zip`
  }));
}

async function planGrade9() {
  const files = await listFiles(grade9Path);
  const markingScheme = files.find((filePath) => /MARKING\s*SCHEMES?|\bMS\b/i.test(path.basename(filePath)));
  const groups = new Map();

  for (const filePath of files) {
    const fileName = path.basename(filePath);
    if (/MARKING\s*SCHEMES?|\bMS\b/i.test(fileName)) continue;

    const subject = inferSubject(fileName, grade9Subjects);
    if (!subject) {
      console.warn(`Skipping unknown Grade 9 file: ${fileName}`);
      continue;
    }

    const group = groups.get(subject) || {
      level: "Grade 9",
      subject,
      titlePrefix: finalKjseaMode ? "Final KJSEA TRIAL" : "Grade 9 KJSEA Prediction Trial 1",
      assessmentSet: finalKjseaMode ? "set-1" : "set-2",
      storageSegment: finalKjseaMode
        ? "2026-term-3-set-1-final-kjsea-trial"
        : "2026-term-3-set-2-kjsea-prediction-trial-1",
      files: []
    };
    group.files.push(filePath);
    groups.set(subject, group);
  }

  if (markingScheme) {
    for (const group of groups.values()) group.files.push(markingScheme);
  }

  return [...groups.values()].map((group) => ({
    ...group,
    term: "term-3",
    fileName: `${group.titlePrefix} - ${group.level} ${group.subject} Term 3.zip`,
    title: `${group.titlePrefix} - ${group.level} ${group.subject} Term 3.zip`
  }));
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
  const planned = [...(finalKjseaMode ? [] : await planGrade6()), ...(await planGrade9())].sort((a, b) =>
    `${a.level}-${a.subject}`.localeCompare(`${b.level}-${b.subject}`)
  );

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
