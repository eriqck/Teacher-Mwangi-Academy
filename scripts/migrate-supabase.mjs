import fs from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile?.(".env.local");

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "materials";

if (!url || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const storePath = path.join(process.cwd(), "data", "store.json");
const raw = await fs.readFile(storePath, "utf8");
const store = JSON.parse(raw);

async function ensureBucket() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  if (buckets.some((entry) => entry.name === bucket)) {
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: true
  });

  if (createError) throw createError;
}

function mapUsers() {
  return store.users.map((user) => ({
    id: user.id,
    full_name: user.fullName,
    email: user.email,
    phone_number: user.phoneNumber,
    role: user.role,
    password_hash: user.passwordHash,
    password_salt: user.passwordSalt,
    created_at: user.createdAt
  }));
}

function mapSessions() {
  return store.sessions.map((session) => ({
    token: session.token,
    user_id: session.userId,
    created_at: session.createdAt,
    expires_at: session.expiresAt
  }));
}

function mapPayments() {
  return store.payments.map((payment) => ({
    id: payment.id,
    user_id: payment.userId,
    kind: payment.kind,
    status: payment.status,
    provider: payment.provider ?? null,
    currency: payment.currency ?? null,
    amount: payment.amount,
    phone_number: payment.phoneNumber ?? "",
    account_reference: payment.accountReference,
    plan: payment.plan,
    scheme_subject: payment.schemeSubject,
    scheme_level: payment.schemeLevel,
    scheme_term: payment.schemeTerm ?? null,
    resource_id: payment.resourceId ?? null,
    payment_reference: payment.paymentReference ?? null,
    authorization_url: payment.authorizationUrl ?? null,
    checkout_request_id: payment.checkoutRequestId,
    merchant_request_id: payment.merchantRequestId,
    mpesa_receipt_number: payment.mpesaReceiptNumber,
    result_code: payment.resultCode,
    result_desc: payment.resultDesc,
    created_at: payment.createdAt,
    updated_at: payment.updatedAt
  }));
}

function mapSubscriptions() {
  return store.subscriptions.map((subscription) => ({
    id: subscription.id,
    user_id: subscription.userId,
    plan: subscription.plan,
    status: subscription.status,
    amount: subscription.amount,
    level_access: subscription.levelAccess,
    start_date: subscription.startDate,
    end_date: subscription.endDate,
    created_at: subscription.createdAt,
    updated_at: subscription.updatedAt,
    payment_id: subscription.paymentId
  }));
}

function mapSchemePurchases() {
  return store.schemePurchases.map((purchase) => ({
    id: purchase.id,
    user_id: purchase.userId,
    resource_id: purchase.resourceId ?? null,
    subject: purchase.subject,
    level: purchase.level,
    term: purchase.term ?? null,
    amount: purchase.amount,
    status: purchase.status,
    payment_id: purchase.paymentId,
    created_at: purchase.createdAt,
    updated_at: purchase.updatedAt
  }));
}

function mapResourcePurchases() {
  return (store.resourcePurchases ?? []).map((purchase) => ({
    id: purchase.id,
    user_id: purchase.userId,
    resource_id: purchase.resourceId,
    title: purchase.title,
    level: purchase.level,
    subject: purchase.subject,
    section: purchase.section,
    assessment_set: purchase.assessmentSet ?? null,
    amount: purchase.amount,
    status: purchase.status,
    payment_id: purchase.paymentId,
    created_at: purchase.createdAt,
    updated_at: purchase.updatedAt
  }));
}

async function mapResources() {
  const mapped = [];

  for (const resource of store.resources) {
    let filePath = resource.filePath;
    let fileUrl = resource.fileUrl;

    if (resource.filePath.startsWith("public/")) {
      const absolutePath = path.join(process.cwd(), resource.filePath);
      const exists = await fs
        .access(absolutePath)
        .then(() => true)
        .catch(() => false);

      if (exists) {
        const storagePath = resource.filePath.replace(/^public[\\/]+uploads[\\/]+/i, "").replace(/\\/g, "/");
        const fileBuffer = await fs.readFile(absolutePath);
        const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, fileBuffer, {
          contentType: resource.mimeType,
          upsert: true
        });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
        filePath = storagePath;
        fileUrl = data.publicUrl;
      }
    }

    mapped.push({
      id: resource.id,
      title: resource.title,
      description: resource.description,
      level: resource.level,
      subject: resource.subject,
      category: resource.category,
      section: resource.section ?? "notes",
      assessment_set: resource.assessmentSet ?? null,
      term: resource.term ?? null,
      audience: resource.audience,
      price: resource.price,
      file_name: resource.fileName,
      file_path: filePath,
      file_url: fileUrl,
      mime_type: resource.mimeType,
      uploaded_by_user_id: resource.uploadedByUserId,
      created_at: resource.createdAt,
      updated_at: resource.updatedAt
    });
  }

  return mapped;
}

async function upsert(table, rows, conflict = "id") {
  if (!rows.length) return;
  const { error } = await supabase.from(table).upsert(rows, { onConflict: conflict });
  if (error) throw error;
}

await ensureBucket();
await upsert("users", mapUsers());
await upsert("sessions", mapSessions(), "token");
await upsert("payments", mapPayments());
await upsert("subscriptions", mapSubscriptions());
await upsert("resources", await mapResources());
await upsert("scheme_purchases", mapSchemePurchases());
await upsert("resource_purchases", mapResourcePurchases());

console.log("Supabase migration complete.");
