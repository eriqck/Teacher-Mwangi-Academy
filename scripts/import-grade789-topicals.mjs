import crypto from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { PDFParse } from "pdf-parse";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

const sourceRoot = "C:\\Users\\Eric\\OneDrive\\Desktop\\Grade 7, 8 & 9 topicals";
const outputRoot = "C:\\Users\\Eric\\Documents\\New project\\grade789-topical-strand-files";
const shouldWrite = process.argv.includes("--write") || process.argv.includes("--upload");
const shouldUpload = process.argv.includes("--upload");
const verbose = process.argv.includes("--verbose");
const allowUnstructured = process.argv.includes("--allow-unstructured");
const gradeFilter = process.argv
  .find((argument) => argument.startsWith("--grade="))
  ?.replace("--grade=", "");

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
const supabaseBucket = process.env.SUPABASE_STORAGE_BUCKET || "materials";

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function cleanText(value) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function subjectFromFileName(fileName) {
  const normalized = fileName.toUpperCase();
  if (normalized.includes("AGRIC")) return "Agriculture & Nutrition";
  if (normalized.includes("INTEGRATED SCIENCE")) return "Integrated Science";
  if (normalized.includes("PRETECHNICAL")) return "Pre-Technical Studies";
  if (normalized.includes("SOCIAL STUDIES")) return "Social Studies";
  if (normalized.includes("CRE")) return "CRE";
  if (normalized.includes("IRE")) return "IRE";
  throw new Error(`Could not determine subject for ${fileName}.`);
}

function gradeFromFileName(fileName) {
  const match = fileName.match(/GRADE\s+([789])\b/i);
  if (!match) throw new Error(`Could not determine grade for ${fileName}.`);
  return `Grade ${match[1]}`;
}

function resourceKind(fileName) {
  return /ANSWER/i.test(fileName) ? "Answers" : "Questions";
}

function strandHeading(text) {
  const match = text.match(/\bSTRAND\s+(\d+)(?:\.\d+)?\s*[:\-]?\s*([^\n]{3,120})/i);
  if (!match) return null;
  const title = match[2]
    .replace(/\bSUB[\s-]*STRAND\b.*$/i, "")
    .replace(/STRAND\s*\d+(?:\.\d+)?\s*[:\-]?.*$/i, "")
    .replace(/SECTION\s+[A-Z].*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!title) return null;
  return {
    key: match[1],
    label: `Strand ${match[1]}.0: ${title}`
  };
}

function topicalHeading(text, index) {
  const match = text.match(/\bTOPICAL\s+(?:REVISION\s+)?(?:QUESTIONS|ANSWERS)\s*:\s*([^\n]{3,140})/i);
  if (!match) return null;
  const title = match[1].replace(/\s+/g, " ").trim();
  return {
    key: `topic-${index + 1}`,
    label: `Topical: ${title}`
  };
}

function fileNameFor(item) {
  const base = `${item.grade} ${item.subject} ${item.strand.label} ${item.kind}`
    .replace(/[<>:"/\\|?*]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 170);
  return `${base}.${item.extension}`;
}

async function planPdf(source) {
  const parser = new PDFParse({ data: await fs.readFile(source.fullPath) });
  const extracted = await parser.getText();
  const strands = [];
  const seenKeys = new Set();

  for (const page of extracted.pages) {
    const heading = strandHeading(page.text) ?? topicalHeading(page.text, strands.length);
    if (!heading || seenKeys.has(heading.key)) continue;
    strands.push({ ...heading, startPage: page.num });
    seenKeys.add(heading.key);
  }

  await parser.destroy();
  return { totalPages: extracted.total, strands };
}

async function planDocx(source) {
  const archive = await JSZip.loadAsync(await fs.readFile(source.fullPath));
  const documentFile = archive.file("word/document.xml");
  if (!documentFile) throw new Error(`${source.fileName} is missing word/document.xml.`);

  const xml = await documentFile.async("string");
  const bodyMatch = xml.match(/(<w:body\b[^>]*>)([\s\S]*)(<\/w:body>)/);
  if (!bodyMatch) throw new Error(`${source.fileName} has no document body.`);

  const blocks = bodyMatch[2].match(/<w:(p|tbl)\b[\s\S]*?<\/w:\1>/g) ?? [];
  const strands = [];
  const seenKeys = new Set();

  for (let index = 0; index < blocks.length; index += 1) {
    const blockText = cleanText(blocks[index]);
    const heading = strandHeading(blockText) ?? topicalHeading(blockText, strands.length);
    if (!heading || seenKeys.has(heading.key)) continue;
    strands.push({ ...heading, startBlock: index });
    seenKeys.add(heading.key);
  }

  return { archive, xml, bodyMatch, blocks, strands };
}

async function buildPlan() {
  const entries = (await fs.readdir(sourceRoot, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /\.(pdf|docx)$/i.test(entry.name))
    .map((entry) => ({
      fullPath: path.join(sourceRoot, entry.name),
      fileName: entry.name,
      extension: path.extname(entry.name).slice(1).toLowerCase(),
      grade: gradeFromFileName(entry.name),
      subject: subjectFromFileName(entry.name),
      kind: resourceKind(entry.name)
    }))
    .filter((entry) => !gradeFilter || entry.grade === `Grade ${gradeFilter}`);

  const plan = [];
  const unstructured = [];

  for (const source of entries.sort((left, right) => left.fileName.localeCompare(right.fileName))) {
    const parsed = source.extension === "pdf" ? await planPdf(source) : await planDocx(source);
    const strands = parsed.strands;

    if (!strands.length) {
      if (source.kind === "Answers") {
        const label = "Topical answer booklet";
        plan.push({
          ...source,
          key: "topical-answers",
          label,
          outputPath: source.fullPath,
          wholeSource: true
        });
      } else {
        unstructured.push(source.fileName);
      }
      continue;
    }

    for (let index = 0; index < strands.length; index += 1) {
      const strand = strands[index];
      const fileName = fileNameFor({ ...source, strand });
      plan.push({
        ...source,
        ...strand,
        endPage: source.extension === "pdf" ? (strands[index + 1]?.startPage ?? parsed.totalPages + 1) - 1 : undefined,
        endBlock: source.extension === "docx" ? (strands[index + 1]?.startBlock ?? parsed.blocks.length) - 1 : undefined,
        fileName,
        outputPath: path.join(outputRoot, slugify(source.grade), slugify(source.subject), fileName)
      });
    }
  }

  return { plan, unstructured };
}

async function writePdfSegment(item) {
  if (fsSync.existsSync(item.outputPath)) return;
  const sourcePdf = await PDFDocument.load(await fs.readFile(item.fullPath));
  const outputPdf = await PDFDocument.create();
  const pageIndexes = Array.from({ length: item.endPage - item.startPage + 1 }, (_, index) => item.startPage - 1 + index);
  const pages = await outputPdf.copyPages(sourcePdf, pageIndexes);
  pages.forEach((page) => outputPdf.addPage(page));
  await fs.mkdir(path.dirname(item.outputPath), { recursive: true });
  await fs.writeFile(item.outputPath, await outputPdf.save());
}

async function writeDocxSegment(item) {
  if (fsSync.existsSync(item.outputPath)) return;
  const parsed = await planDocx(item);
  const [openingTag, bodyInner, closingTag] = parsed.bodyMatch;
  const sectionProperties = bodyInner.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/)?.[0] ?? "";
  const selectedBlocks = parsed.blocks.slice(item.startBlock, item.endBlock + 1).join("");
  const nextBody = `${openingTag}${selectedBlocks}${sectionProperties}${closingTag}`;
  const nextXml = parsed.xml.replace(parsed.bodyMatch[0], nextBody);
  parsed.archive.file("word/document.xml", nextXml);
  await fs.mkdir(path.dirname(item.outputPath), { recursive: true });
  await fs.writeFile(item.outputPath, await parsed.archive.generateAsync({ type: "nodebuffer" }));
}

async function writePlan(plan) {
  for (const item of plan) {
    if (item.wholeSource) continue;
    if (item.extension === "pdf") {
      await writePdfSegment(item);
    } else {
      await writeDocxSegment(item);
    }
  }
}

function r2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2Config.accessKeyId,
      secretAccessKey: r2Config.secretAccessKey
    }
  });
}

async function uploadManagedFile({ supabase, r2, storagePath, body, contentType }) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      if (r2) {
        await r2.send(new PutObjectCommand({
          Bucket: r2Config.bucket,
          Key: storagePath,
          Body: body,
          ContentType: contentType
        }));
        return `${r2Config.publicBaseUrl}/${storagePath}`;
      }

      const uploaded = await supabase.storage.from(supabaseBucket).upload(storagePath, body, {
        contentType,
        upsert: false
      });
      if (uploaded.error) throw new Error(uploaded.error.message);
      return supabase.storage.from(supabaseBucket).getPublicUrl(storagePath).data.publicUrl;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Managed storage upload failed.");
}

function mimeType(extension) {
  return extension === "pdf"
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

async function uploadPlan(plan) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase configuration is required.");
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const admin = await supabase
    .from("users")
    .select("id")
    .eq("email", process.env.ADMIN_EMAIL || "ericdavid348@gmail.com")
    .maybeSingle();
  if (admin.error || !admin.data?.id) throw new Error(admin.error?.message || "Admin user was not found.");

  const r2 = Object.values(r2Config).every(Boolean) ? r2Client() : null;
  let uploaded = 0;
  let skipped = 0;

  for (const item of plan) {
    console.log(`Checking: ${item.grade} / ${item.subject} / ${item.label} / ${item.kind}`);
    const existing = await supabase
      .from("resources")
      .select("id")
      .eq("level", item.grade)
      .eq("section", "assessment")
      .eq("assessment_set", "strand-based-assessments")
      .eq("file_name", item.fileName)
      .limit(1);
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data?.length) {
      skipped += 1;
      console.log(`Skipping existing: ${item.fileName}`);
      continue;
    }

    const storagePath = `materials/${slugify(item.grade)}/strand-based/${Date.now()}-${slugify(item.fileName)}`;
    console.log(`Uploading: ${item.fileName}`);
    const fileUrl = await uploadManagedFile({
      supabase,
      r2,
      storagePath,
      body: await fs.readFile(item.outputPath),
      contentType: mimeType(item.extension)
    });

    const now = new Date().toISOString();
    const saved = await supabase.from("resources").insert({
      id: `resource_${crypto.randomUUID()}`,
      title: path.parse(item.fileName).name,
      description: `${item.grade} ${item.subject} ${item.label} topical ${item.kind.toLowerCase()}.`,
      level: item.grade,
      subject: item.subject,
      category: "revision-material",
      section: "assessment",
      assessment_set: "strand-based-assessments",
      term: null,
      audience: "both",
      price: null,
      file_name: item.fileName,
      file_path: storagePath,
      file_url: fileUrl,
      mime_type: mimeType(item.extension),
      uploaded_by_user_id: admin.data.id,
      created_at: now,
      updated_at: now
    });
    if (saved.error) throw new Error(saved.error.message);
    uploaded += 1;
    console.log(`Uploaded: ${item.grade} / ${item.subject} / ${item.key} / ${item.kind}`);
  }

  console.log(`Completed. Uploaded ${uploaded}; skipped ${skipped} existing files.`);
}

async function main() {
  const { plan, unstructured } = await buildPlan();
  const counts = plan.reduce((summary, item) => {
    const key = `${item.grade} | ${item.subject} | ${item.kind}`;
    summary[key] = (summary[key] ?? 0) + 1;
    return summary;
  }, {});
  console.table(Object.entries(counts).map(([key, count]) => ({ collection: key, strandFiles: count })));
  if (verbose) {
    console.table(plan.map((item) => ({
      grade: item.grade,
      subject: item.subject,
      kind: item.kind,
      strand: item.label,
      pages: item.startPage ? `${item.startPage}-${item.endPage}` : "DOCX",
      source: item.fullPath.split("\\").at(-1)
    })));
  }
  console.log(`Prepared ${plan.length} strand files.`);
  if (unstructured.length) {
    console.log("Files requiring a manual structure check:");
    unstructured.forEach((fileName) => console.log(`- ${fileName}`));
  }
  if (!shouldWrite) return;
  if (unstructured.length && !allowUnstructured) {
    throw new Error("Refusing to write or upload while source files remain unstructured. Use --allow-unstructured only after reviewing the listed files.");
  }

  await writePlan(plan);
  console.log(`Wrote ${plan.length} split files to ${outputRoot}.`);
  if (shouldUpload) {
    console.log(`Publishing ${plan.length} files to managed storage.`);
    await uploadPlan(plan);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
