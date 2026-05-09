import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

function getEnv(name, fallback = "") {
  return (process.env[name] || fallback).trim();
}

function requireEnv(name) {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function toPublicFileUrl(baseUrl, objectKey) {
  const encodedPath = objectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${trimTrailingSlash(baseUrl)}/${encodedPath}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retry(task, label, attempts = 3) {
  let lastError;

  for (let index = 1; index <= attempts; index += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (index < attempts) {
        console.warn(`${label} failed on attempt ${index}. Retrying...`);
        await sleep(index * 1000);
      }
    }
  }

  throw lastError;
}

async function fetchAllResources(supabase) {
  const pageSize = 1000;
  const rows = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("resources")
      .select("id,title,file_path,file_url,file_name,mime_type,updated_at")
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`Failed to read resources: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    rows.push(...data);

    if (data.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return rows;
}

function shouldMigrateResource(resource, publicBaseUrl) {
  if (!resource.file_path) return false;
  if (!resource.file_url) return true;
  return !resource.file_url.startsWith(trimTrailingSlash(publicBaseUrl));
}

async function downloadSupabaseFile(supabase, bucket, filePath) {
  const { data, error } = await supabase.storage.from(bucket).download(filePath);
  if (error) {
    throw new Error(`Failed to download ${filePath}: ${error.message}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

async function uploadToR2(client, bucket, filePath, fileBuffer, mimeType, fileName) {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: filePath,
      Body: fileBuffer,
      ContentType: mimeType || undefined,
      ...(fileName ? { ContentDisposition: `inline; filename="${fileName.replace(/"/g, "")}"` } : {})
    })
  );
}

async function updateResourceUrl(supabase, resourceId, fileUrl) {
  const { error } = await supabase
    .from("resources")
    .update({
      file_url: fileUrl,
      updated_at: new Date().toISOString()
    })
    .eq("id", resourceId);

  if (error) {
    throw new Error(`Failed to update resource ${resourceId}: ${error.message}`);
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : null;

  const supabaseUrl = requireEnv("SUPABASE_URL");
  const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseBucket = getEnv("SUPABASE_STORAGE_BUCKET", "materials");

  const r2AccountId = requireEnv("R2_ACCOUNT_ID");
  const r2AccessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const r2SecretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");
  const r2Bucket = requireEnv("R2_BUCKET");
  const r2PublicBaseUrl = requireEnv("R2_PUBLIC_BASE_URL");

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey
    }
  });

  const allResources = await fetchAllResources(supabase);
  const candidates = allResources.filter((resource) => shouldMigrateResource(resource, r2PublicBaseUrl));
  const planned = limit ? candidates.slice(0, limit) : candidates;

  console.log(
    JSON.stringify(
      {
        dryRun,
        totalResources: allResources.length,
        eligibleResources: candidates.length,
        plannedResources: planned.length,
        r2Bucket,
        r2PublicBaseUrl
      },
      null,
      2
    )
  );

  if (planned.length === 0) {
    console.log("No resources require migration.");
    return;
  }

  for (const resource of planned) {
    const nextUrl = toPublicFileUrl(r2PublicBaseUrl, resource.file_path);

    console.log(`Migrating ${resource.file_path} -> ${nextUrl}`);

    if (dryRun) {
      continue;
    }

    const fileBuffer = await retry(
      () => downloadSupabaseFile(supabase, supabaseBucket, resource.file_path),
      `Download ${resource.file_path}`
    );

    await retry(
      () =>
        uploadToR2(
          r2,
          r2Bucket,
          resource.file_path,
          fileBuffer,
          resource.mime_type || "application/octet-stream",
          resource.file_name || resource.title || "file"
        ),
      `Upload ${resource.file_path}`
    );

    await retry(
      () => updateResourceUrl(supabase, resource.id, nextUrl),
      `Update database for ${resource.id}`
    );
  }

  console.log(`Migration complete for ${planned.length} resource(s).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
