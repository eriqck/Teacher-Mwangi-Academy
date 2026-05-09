import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSupabaseAdmin, getSupabaseBucket, isSupabaseConfigured } from "@/lib/supabase";

type ManagedStorageMode = "r2" | "supabase" | "local";

function getEnv(name: string) {
  return process.env[name]?.trim();
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function isR2Configured() {
  return Boolean(
    getEnv("R2_ACCOUNT_ID") &&
      getEnv("R2_ACCESS_KEY_ID") &&
      getEnv("R2_SECRET_ACCESS_KEY") &&
      getEnv("R2_BUCKET") &&
      getEnv("R2_PUBLIC_BASE_URL")
  );
}

export function getManagedStorageMode(): ManagedStorageMode {
  if (isR2Configured()) return "r2";
  if (isSupabaseConfigured()) return "supabase";
  return "local";
}

export function isManagedStorageConfigured() {
  return getManagedStorageMode() !== "local";
}

function getR2Client() {
  const accountId = getEnv("R2_ACCOUNT_ID");
  const accessKeyId = getEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = getEnv("R2_SECRET_ACCESS_KEY");

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, or R2_SECRET_ACCESS_KEY.");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
}

function getR2Bucket() {
  const bucket = getEnv("R2_BUCKET");
  if (!bucket) {
    throw new Error("Missing R2_BUCKET.");
  }
  return bucket;
}

function getR2PublicBaseUrl() {
  const baseUrl = getEnv("R2_PUBLIC_BASE_URL");
  if (!baseUrl) {
    throw new Error("Missing R2_PUBLIC_BASE_URL.");
  }
  return trimTrailingSlash(baseUrl);
}

function getSupabasePublicUrl(filePath: string) {
  const supabase = getSupabaseAdmin();
  const bucket = getSupabaseBucket();
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

export function getManagedFilePublicUrl(filePath: string) {
  const mode = getManagedStorageMode();

  if (mode === "r2") {
    return `${getR2PublicBaseUrl()}/${filePath}`;
  }

  if (mode === "supabase") {
    return getSupabasePublicUrl(filePath);
  }

  return `/${filePath.replace(/^public[\\/]/, "").replace(/\\/g, "/")}`;
}

export async function uploadManagedFile(filePath: string, fileBuffer: Buffer, mimeType: string) {
  const mode = getManagedStorageMode();

  if (mode === "r2") {
    const client = getR2Client();
    await client.send(
      new PutObjectCommand({
        Bucket: getR2Bucket(),
        Key: filePath,
        Body: fileBuffer,
        ContentType: mimeType
      })
    );
    return getManagedFilePublicUrl(filePath);
  }

  if (mode === "supabase") {
    const supabase = getSupabaseAdmin();
    const bucket = getSupabaseBucket();
    const { error } = await supabase.storage.from(bucket).upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: false
    });
    if (error) throw new Error(error.message);
    return getManagedFilePublicUrl(filePath);
  }

  throw new Error("Managed storage is not configured.");
}

export async function createManagedSignedUpload(filePath: string, mimeType?: string) {
  const mode = getManagedStorageMode();

  if (mode === "r2") {
    const client = getR2Client();
    const signedUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: getR2Bucket(),
        Key: filePath,
        ...(mimeType ? { ContentType: mimeType } : {})
      }),
      { expiresIn: 60 * 15 }
    );

    return { signedUrl, path: filePath, token: null };
  }

  if (mode === "supabase") {
    const supabase = getSupabaseAdmin();
    const bucket = getSupabaseBucket();
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(filePath);
    if (error) throw new Error(error.message);
    return data;
  }

  throw new Error("Managed storage is not configured.");
}

export async function deleteManagedFile(filePath: string) {
  if (!filePath) return;

  const mode = getManagedStorageMode();

  if (mode === "r2") {
    const client = getR2Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: getR2Bucket(),
        Key: filePath
      })
    );
    return;
  }

  if (mode === "supabase") {
    const supabase = getSupabaseAdmin();
    const bucket = getSupabaseBucket();
    const { error } = await supabase.storage.from(bucket).remove([filePath]);
    if (error && !error.message.toLowerCase().includes("not found")) {
      throw new Error(error.message);
    }
  }
}
