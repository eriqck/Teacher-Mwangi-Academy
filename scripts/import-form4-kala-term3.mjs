import crypto from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { PDFParse } from "pdf-parse";

const defaultSourcePath = "C:\\Users\\Eric\\Downloads\\KALA EXAMS TERM 3";
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

const fileNameSubjectRules = [
  [/\b451\b|\bCOMP\b|COMPUTER/i, "Computer Studies"],
  [/PHYSICS|232/i, "Physics"],
  [/\bDD\b|DRAWING|449/i, "Drawing and Design"],
  [/ELECTRICITY|448/i, "Electricity"],
  [/\bAGRIC|AGRICULTURE|443/i, "Agriculture"],
  [/\bBIO\b|BIOLOGY|231/i, "Biology"],
  [/BUSINESS|565/i, "Business Studies"],
  [/\bCRE\b|C\.?R\.?E|313/i, "CRE"],
  [/CHEM|CHEMISTRY|233/i, "Chemistry"],
  [/ENGLISH|101/i, "English"],
  [/FRENCH|501/i, "French"],
  [/GEOG|GEOGRAPHY|312/i, "Geography"],
  [/KISWAHILI|MWONGOZO|FASIHI|102/i, "Kiswahili"],
  [/\bMATH|MATHEMATICS|121/i, "Mathematics"]
];

const contentSubjectRules = [
  [/451\/[12]|COMPUTER STUDIES/i, "Computer Studies"],
  [/232\/[123]|PHYSICS/i, "Physics"],
  [/449\/[12]|DRAWING AND DESIGN/i, "Drawing and Design"],
  [/448\/[12]|ELECTRICITY/i, "Electricity"],
  [/443\/[12]|\bAGRICULTURE/i, "Agriculture"],
  [/231\/[123]|\bBIOLOGY/i, "Biology"],
  [/565\/[12]|BUSINESS STUDIES/i, "Business Studies"],
  [/313\/[12]|CHRISTIAN RELIGIOUS EDUCATION|\bCRE\b/i, "CRE"],
  [/233\/[123]|CHEMISTRY/i, "Chemistry"],
  [/101\/[123]|ENGLISH/i, "English"],
  [/501\/[123]|FRENCH/i, "French"],
  [/312\/[12]|GEOGRAPHY/i, "Geography"],
  [/102\/[123]|KISWAHILI|MWONGOZO|FASIHI/i, "Kiswahili"],
  [/121\/[12]|MATHEMATICS/i, "Mathematics"]
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
  if (/\.zip$/i.test(fileName)) return "application/zip";
  if (/\.docx$/i.test(fileName)) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (/\.pdf$/i.test(fileName)) return "application/pdf";
  return "application/octet-stream";
}

function inferSubject(text, rules) {
  const match = rules.find(([pattern]) => pattern.test(text));
  return match?.[1] ?? null;
}

async function extractDocxText(filePath) {
  const zip = await JSZip.loadAsync(await fs.readFile(filePath));
  const xml = await zip.file("word/document.xml")?.async("string");
  return (xml || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 1800);
}

async function extractPdfText(filePath) {
  const parser = new PDFParse({ data: await fs.readFile(filePath) });
  try {
    const result = await parser.getText();
    return result.text.replace(/\s+/g, " ").slice(0, 1800);
  } finally {
    await parser.destroy();
  }
}

async function inspectFile(filePath) {
  const fileName = path.basename(filePath);
  let contentText = "";

  try {
    if (/\.docx$/i.test(fileName)) {
      contentText = await extractDocxText(filePath);
    } else if (/\.pdf$/i.test(fileName)) {
      contentText = await extractPdfText(filePath);
    }
  } catch (error) {
    contentText = "";
    console.warn(`Could not inspect ${fileName}: ${error instanceof Error ? error.message : error}`);
  }

  const subject = inferSubject(fileName, fileNameSubjectRules) || inferSubject(contentText, contentSubjectRules);

  return {
    filePath,
    fileName,
    subject,
    preview: contentText.slice(0, 160)
  };
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

async function main() {
  const sourceFiles = await listSourceFiles(sourcePath);
  const inspected = [];

  for (const filePath of sourceFiles) {
    inspected.push(await inspectFile(filePath));
  }

  const skipped = inspected.filter((item) => !item.subject);
  const groups = new Map();

  for (const item of inspected.filter((file) => file.subject)) {
    const current = groups.get(item.subject) || { subject: item.subject, files: [] };
    current.files.push(item);
    groups.set(item.subject, current);
  }

  const planned = [...groups.values()]
    .map((group) => ({
      ...group,
      title: `Form 4 ${group.subject} Term 3.zip`,
      fileName: `Form 4 ${group.subject} Term 3.zip`
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject));

  console.table(
    planned.map((item) => ({
      subject: item.subject,
      title: item.title,
      files: item.files.length
    }))
  );

  if (skipped.length > 0) {
    console.log("Skipped files without a clear subject:");
    for (const item of skipped) console.log(`- ${item.fileName}`);
  }

  if (dryRun) {
    console.log(`DRY RUN: ${planned.length} Form 4 KALA Term 3 subject bundles planned. No upload performed.`);
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
    .eq("assessment_set", "kala-exams")
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
    for (const file of item.files.sort((a, b) => a.fileName.localeCompare(b.fileName))) {
      outputZip.file(file.fileName, await fs.readFile(file.filePath));
    }

    const bundleBuffer = await outputZip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    });

    const storagePath = `materials/form-4/assessments/2026-term-3-kala-exams/${Date.now()}-${slugify(
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
      description: `KALA Term 3 assessment bundle for Form 4 ${item.subject}.`,
      level: "Form 4",
      subject: item.subject,
      category: "revision-material",
      section: "assessment",
      assessment_set: "kala-exams",
      term: "term-3",
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
    console.log(`Uploaded ${item.title} -> Form 4 / Term 3 / KALA Exams`);
  }

  console.log(`Completed. Uploaded ${uploaded} bundles. Skipped ${skippedExisting} existing bundles.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
