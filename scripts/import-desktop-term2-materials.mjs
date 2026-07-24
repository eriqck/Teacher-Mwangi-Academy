import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const defaultFolder = "C:\\Users\\Eric\\Desktop\\term 2";
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "materials";
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.argv.includes("--dry-run");

const subjectMap = [
  { match: /^AGRICULTURE$/i, subject: "Agriculture & Nutrition", title: "Agriculture & Nutrition" },
  { match: /^CRE$/i, subject: "Religious Education", title: "Religious Education" },
  { match: /^IRE$/i, subject: "Religious Education", title: "Religious Education (IRE)" },
  { match: /^CREATIVE ARTS$/i, subject: "Creative Arts and Sports", title: "Creative Arts and Sports" },
  { match: /^CREATIVE ARTS AND SPORTS$/i, subject: "Creative Arts and Sports", title: "Creative Arts and Sports" },
  { match: /^ENGLISH COMPOSITION$/i, subject: "English", title: "English Composition" },
  { match: /^ENGLISH GRAMMAR$/i, subject: "English", title: "English Grammar" },
  { match: /^ENGLISH READING$/i, subject: "English", title: "English Reading" },
  { match: /^ENGLISH PAPER 1$/i, subject: "English", title: "English Paper 1" },
  { match: /^ENGLISH PAPER 2$/i, subject: "English", title: "English Paper 2" },
  { match: /^KISWAHILI GRAMMAR$/i, subject: "Kiswahili", title: "Kiswahili Grammar" },
  { match: /^KISWAHILI INSHA$/i, subject: "Kiswahili", title: "Kiswahili Insha" },
  { match: /^KISWAHILI KUSOMA$/i, subject: "Kiswahili", title: "Kiswahili Kusoma" },
  { match: /^KISWAHILI PAPER 1$/i, subject: "Kiswahili", title: "Kiswahili Paper 1" },
  { match: /^KISWAHILI PAPER 2$/i, subject: "Kiswahili", title: "Kiswahili Paper 2" },
  { match: /^MATHEMATICS$/i, subject: "Mathematics", title: "Mathematics" },
  { match: /^SCIENCE AND TECHNOLOGY$/i, subject: "Integrated Science", title: "Integrated Science" },
  { match: /^INTEGRATED SCIENCE PAPER 1$/i, subject: "Integrated Science", title: "Integrated Science Paper 1" },
  { match: /^INTEGRATED SCIENCE PAPER 2$/i, subject: "Integrated Science", title: "Integrated Science Paper 2" },
  { match: /^SOCIAL STUDIES$/i, subject: "Social Studies", title: "Social Studies" },
  { match: /^PRETECHNICAL STUDIES$/i, subject: "Pre-Technical Studies", title: "Pre-Technical Studies" }
];

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function findSubjectDetails(rawSubject) {
  const match = subjectMap.find((item) => item.match.test(rawSubject.trim()));
  if (!match) {
    throw new Error(`Could not map subject from file name chunk: "${rawSubject}"`);
  }

  return match;
}

function parseFileName(fileName) {
  const parsed = path.parse(fileName);
  const match = /^GRADE\s+(\d+)\s+(.+)$/i.exec(parsed.name.trim());

  if (!match) {
    throw new Error(`Could not parse grade/subject from file name: "${fileName}"`);
  }

  const grade = Number(match[1]);
  const rawSubject = match[2].trim();
  const { subject, title } = findSubjectDetails(rawSubject);

  return {
    level: `Grade ${grade}`,
    subject,
    title
  };
}

async function getAdminUserId() {
  if (process.env.UPLOADED_BY_USER_ID) {
    return process.env.UPLOADED_BY_USER_ID;
  }

  const storePath = path.join(process.cwd(), "data", "store.json");
  const raw = await fs.readFile(storePath, "utf8");
  const store = JSON.parse(raw);
  const admin = (store.users || []).find((user) => user.role === "admin");

  if (!admin?.id) {
    throw new Error("Could not find an admin user in data/store.json");
  }

  return admin.id;
}

async function listFiles(folderPath) {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(folderPath, entry.name))
    .filter((fullPath) => /\.(docx|pdf)$/i.test(fullPath))
    .sort((left, right) => left.localeCompare(right));
}

async function retry(task, label, attempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;

      if (attempt === attempts) {
        break;
      }

      console.warn(`${label} failed on attempt ${attempt}. Retrying...`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }

  throw lastError;
}

async function main() {
  const folderPath = process.argv.find((arg) => !arg.startsWith("--") && arg !== process.argv[1] && arg !== process.argv[0]) || defaultFolder;
  const files = await listFiles(folderPath);
  const uploadedByUserId = await getAdminUserId();

  const planned = files.map((fullPath) => {
    const fileName = path.basename(fullPath);
    const parsed = parseFileName(fileName);

    return {
      fullPath,
      fileName,
      ...parsed,
      description: `${parsed.title} assessment material for ${parsed.level}, Term 2 Set 1.`,
      category: "revision-material",
      section: "assessment",
      assessmentSet: "set-1",
      term: "term-2",
      audience: "both",
      uploadedByUserId
    };
  });

  console.table(
    planned.map((item) => ({
      level: item.level,
      subject: item.subject,
      title: item.title,
      term: item.term,
      set: item.assessmentSet,
      fileName: item.fileName
    }))
  );

  if (dryRun) {
    console.log(`DRY RUN: ${planned.length} files classified. No upload performed.`);
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

  const plannedFileNames = planned.map((item) => item.fileName);
  const existingRes = await supabase
    .from("resources")
    .select("file_name")
    .eq("section", "assessment")
    .eq("category", "revision-material")
    .eq("term", "term-2")
    .eq("assessment_set", "set-1")
    .in("file_name", plannedFileNames);

  if (existingRes.error) {
    throw new Error(`Existing resource check failed: ${existingRes.error.message}`);
  }

  const existingFileNames = new Set((existingRes.data || []).map((row) => row.file_name));

  for (const item of planned) {
    if (existingFileNames.has(item.fileName)) {
      console.log(`Skipping existing: ${item.fileName}`);
      continue;
    }

    const timestamp = Date.now();
    const safeFileName = `${slugify(path.parse(item.fileName).name)}${path.extname(item.fileName).toLowerCase()}`;
    const storagePath = `materials/${timestamp}-${safeFileName}`;
    const fileBuffer = await fs.readFile(item.fullPath);

    const uploadRes = await retry(
      () =>
        supabase.storage.from(bucket).upload(storagePath, fileBuffer, {
          contentType: item.fileName.toLowerCase().endsWith(".docx")
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "application/pdf",
          upsert: false
        }),
      `Upload failed for ${item.fileName}`
    );

    if (uploadRes.error) {
      throw new Error(`Upload failed for ${item.fileName}: ${uploadRes.error.message}`);
    }

    const publicUrl = supabase.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;
    const record = {
      id: createId("resource"),
      title: item.title,
      description: item.description,
      level: item.level,
      subject: item.subject,
      category: item.category,
      section: item.section,
      assessment_set: item.assessmentSet,
      term: item.term,
      audience: item.audience,
      price: null,
      file_name: item.fileName,
      file_path: storagePath,
      file_url: publicUrl,
      mime_type: item.fileName.toLowerCase().endsWith(".docx")
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/pdf",
      uploaded_by_user_id: item.uploadedByUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const insertRes = await retry(
      () => supabase.from("resources").insert(record),
      `Metadata save failed for ${item.fileName}`
    );

    if (insertRes.error) {
      await supabase.storage.from(bucket).remove([storagePath]).catch(() => undefined);
      throw new Error(`Metadata save failed for ${item.fileName}: ${insertRes.error.message}`);
    }

    console.log(`Uploaded: ${item.fileName} -> ${item.level} / ${item.subject} / Term 2 Set 1`);
  }

  console.log(`Completed: ${planned.length} files uploaded to Supabase.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
