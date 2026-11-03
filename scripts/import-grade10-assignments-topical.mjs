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

const subjectRules = [
  [/APPLIED\s+AGRICULTURE|\bAGRICULTURE\b/i, "Applied Agriculture"],
  [/AVIATION/i, "Aviation Technology"],
  [/BIOLOGY/i, "Biology"],
  [/BUILDING\s+TECHNOLOGY/i, "Building Technology"],
  [/BUSINESS\s+STUDIES/i, "Business Studies"],
  [/CHEMISTRY/i, "Chemistry"],
  [/COMPUTER\s+SCIENCE/i, "Computer Science"],
  [/CORE\s+MATHEMATICS/i, "Core Mathematics"],
  [/ESSENTIAL\s+MATHEMATICS/i, "Essential Mathematics"],
  [/ELECTRIC(?:AL|ITY)\s+TECHNOLOGY/i, "Electrical Technology"],
  [/\bCRE\b/i, "CRE"],
  [/\bCSL\b/i, "CSL"],
  [/ENGLISH/i, "English"],
  [/(?:FASIHI|FASAIHI)\s+KISWAHILI|KISWAHILI\s+(?:FASIHI|FASAIHI)/i, "Kiswahili Fasihi"],
  [/FINE\s+ARTS/i, "Fine Arts"],
  [/GENERAL\s+SCIENCE/i, "General Science"],
  [/GEOGRAPHY/i, "Geography"],
  [/HISTORY\s+AND\s+CITIZENSHIP/i, "History and Citizenship"],
  [/HOME\s*SCIENCE/i, "Home Science"],
  [/KISWAHILI\s+LUGHA/i, "Kiswahili Lugha"],
  [/KISWAHILI/i, "Kiswahili"],
  [/LITERATURE/i, "Literature"],
  [/MANDARIN/i, "Mandarin"],
  [/MARINE\s+TECHNOLOGY/i, "Marine Technology"],
  [/MUSIC\s+AND\s+DANCE/i, "Music and Dance"],
  [/PHYSICS/i, "Physics"],
  [/THEATRE\s+AND\s+FILM\s+TECHNOLOGY/i, "Theatre and Film Technology"]
];

function slugify(value) {
  return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function subjectFor(fileName) {
  return subjectRules.find(([pattern]) => pattern.test(fileName))?.[1] ?? "General Assessment";
}

function titleFor(fileName) {
  return path.parse(fileName).name.replace(/\s*\(\d+\)/g, "").replace(/\s+/g, " ").trim();
}

function mimeFor(fileName) {
  return /\.pdf$/i.test(fileName)
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

async function folderFiles(folder) {
  const entries = await fs.readdir(path.join(sourceRoot, folder), { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /\.(pdf|docx)$/i.test(entry.name))
    .map((entry) => path.join(sourceRoot, folder, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

async function getPlan() {
  const sources = [
    { folder: "Grade 10 Assignments", assessmentSet: "set-2", label: "Assignment" },
    { folder: "Grade 10 topical", assessmentSet: "set-3", label: "Topical revision" }
  ];
  const plan = [];
  for (const source of sources) {
    for (const fullPath of await folderFiles(source.folder)) {
      const fileName = path.basename(fullPath);
      plan.push({ ...source, fullPath, fileName, subject: subjectFor(fileName), title: titleFor(fileName) });
    }
  }
  return plan;
}

function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: r2Config.accessKeyId, secretAccessKey: r2Config.secretAccessKey }
  });
}

async function getAdminId(supabase) {
  const result = await supabase.from("users").select("id").eq("email", process.env.ADMIN_EMAIL || "ericdavid348@gmail.com").maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if (!result.data?.id) throw new Error("Admin user was not found.");
  return result.data.id;
}

async function main() {
  const plan = await getPlan();
  console.table(plan.map((item) => ({ source: item.label, set: item.assessmentSet, subject: item.subject, file: item.fileName })));
  if (dryRun) return;
  if (!supabaseUrl || !supabaseKey || !Object.values(r2Config).every(Boolean)) {
    throw new Error("Supabase and R2 configuration are required.");
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const uploadedByUserId = await getAdminId(supabase);
  const r2 = getR2Client();
  let uploaded = 0;
  let skipped = 0;

  for (const item of plan) {
    const existing = await supabase
      .from("resources")
      .select("id")
      .eq("level", "Grade 10")
      .eq("category", "revision-material")
      .eq("section", "assessment")
      .eq("term", "term-3")
      .eq("file_name", item.fileName)
      .limit(1);
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data?.length) {
      skipped += 1;
      console.log(`Skipping existing: ${item.fileName}`);
      continue;
    }

    const storagePath = `materials/grade-10/assessment/2026-term-3-${item.assessmentSet}/${Date.now()}-${slugify(item.fileName)}`;
    const mimeType = mimeFor(item.fileName);
    await r2.send(new PutObjectCommand({
      Bucket: r2Config.bucket,
      Key: storagePath,
      Body: await fs.readFile(item.fullPath),
      ContentType: mimeType
    }));
    const now = new Date().toISOString();
    const saved = await supabase.from("resources").insert({
      id: `resource_${crypto.randomUUID()}`,
      title: item.title,
      description: `${item.label} material for Grade 10 ${item.subject}, Term 3 ${item.assessmentSet.replace("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}.`,
      level: "Grade 10",
      subject: item.subject,
      category: "revision-material",
      section: "assessment",
      assessment_set: item.assessmentSet,
      term: "term-3",
      audience: "both",
      price: null,
      file_name: item.fileName,
      file_path: storagePath,
      file_url: `${r2Config.publicBaseUrl}/${storagePath}`,
      mime_type: mimeType,
      uploaded_by_user_id: uploadedByUserId,
      created_at: now,
      updated_at: now
    });
    if (saved.error) throw new Error(saved.error.message);
    uploaded += 1;
    console.log(`Uploaded: ${item.label} / ${item.assessmentSet} / ${item.subject} / ${item.fileName}`);
  }
  console.log(`Completed. Uploaded ${uploaded} files and skipped ${skipped} existing files.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
