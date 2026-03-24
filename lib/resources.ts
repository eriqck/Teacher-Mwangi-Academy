import { promises as fs } from "fs";
import path from "path";
import { createId } from "@/lib/auth";
import { schemeOfWorkPrice } from "@/lib/business";
import { saveResourceRecord, uploadResourceFile } from "@/lib/repository";
import type { ResourceCategory, ResourceRecord } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function sanitizeFileName(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  const base = path.basename(fileName, ext);
  const safeBase = slugify(base) || "upload";
  return `${safeBase}${ext}`;
}

export async function saveUploadedResource(input: {
  title: string;
  description: string;
  level: string;
  subject: string;
  category: ResourceCategory;
  audience: "parent" | "teacher" | "both";
  uploadedByUserId: string;
  file: File;
}) {
  const timestamp = Date.now();
  const safeFileName = sanitizeFileName(input.file.name);
  const folderName = input.category === "scheme-of-work" ? "schemes" : "materials";
  const relativeDir = path.join("public", "uploads", folderName);
  const absoluteDir = path.join(process.cwd(), relativeDir);
  const relativePath = path.join(relativeDir, `${timestamp}-${safeFileName}`);
  const absolutePath = path.join(process.cwd(), relativePath);
  const fileBuffer = Buffer.from(await input.file.arrayBuffer());

  let fileUrl: string;
  let filePath: string;

  if (isSupabaseConfigured()) {
    const storagePath = `${folderName}/${timestamp}-${safeFileName}`;
    fileUrl = await uploadResourceFile(storagePath, fileBuffer, input.file.type || "application/octet-stream");
    filePath = storagePath;
  } else {
    await fs.mkdir(absoluteDir, { recursive: true });
    await fs.writeFile(absolutePath, fileBuffer);
    filePath = relativePath.replace(/\\/g, "/");
    fileUrl = `/${relativePath.replace(/^public[\\/]/, "").replace(/\\/g, "/")}`;
  }

  const now = new Date().toISOString();
  const record: ResourceRecord = {
    id: createId("resource"),
    title: input.title.trim(),
    description: input.description.trim(),
    level: input.level,
    subject: input.subject.trim(),
    category: input.category,
    audience: input.category === "scheme-of-work" ? "teacher" : input.audience,
    price: input.category === "scheme-of-work" ? schemeOfWorkPrice : null,
    fileName: input.file.name,
    filePath,
    fileUrl,
    mimeType: input.file.type || "application/octet-stream",
    uploadedByUserId: input.uploadedByUserId,
    createdAt: now,
    updatedAt: now
  };

  await saveResourceRecord(record);

  return record;
}
