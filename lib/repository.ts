import { promises as fs } from "fs";
import path from "path";
import type {
  DataStore,
  PaymentRecord,
  ResourceRecord,
  SchemePurchaseRecord,
  SessionRecord,
  SubscriptionRecord,
  SubscriptionPlan,
  UserRecord
} from "@/lib/store";
import { readStore, updateStore } from "@/lib/store";
import { getSupabaseAdmin, getSupabaseBucket, isSupabaseConfigured } from "@/lib/supabase";

function mapUser(row: Record<string, unknown>): UserRecord {
  return {
    id: `${row.id}`,
    fullName: `${row.full_name}`,
    email: `${row.email}`,
    phoneNumber: `${row.phone_number}`,
    role: row.role as UserRecord["role"],
    passwordHash: `${row.password_hash}`,
    passwordSalt: `${row.password_salt}`,
    createdAt: `${row.created_at}`
  };
}

function mapSession(row: Record<string, unknown>): SessionRecord {
  return {
    token: `${row.token}`,
    userId: `${row.user_id}`,
    createdAt: `${row.created_at}`,
    expiresAt: `${row.expires_at}`
  };
}

function mapPayment(row: Record<string, unknown>): PaymentRecord {
  return {
    id: `${row.id}`,
    userId: `${row.user_id}`,
    kind: row.kind as PaymentRecord["kind"],
    status: row.status as PaymentRecord["status"],
    provider: (row.provider as PaymentRecord["provider"]) ?? undefined,
    currency: (row.currency as string | null) ?? undefined,
    amount: Number(row.amount),
    phoneNumber: `${row.phone_number ?? ""}`,
    accountReference: `${row.account_reference}`,
    plan: (row.plan as SubscriptionPlan | null) ?? null,
    schemeSubject: (row.scheme_subject as string | null) ?? null,
    schemeLevel: (row.scheme_level as string | null) ?? null,
    schemeTerm: (row.scheme_term as PaymentRecord["schemeTerm"] | null) ?? null,
    paymentReference: (row.payment_reference as string | null) ?? null,
    authorizationUrl: (row.authorization_url as string | null) ?? null,
    checkoutRequestId: (row.checkout_request_id as string | null) ?? null,
    merchantRequestId: (row.merchant_request_id as string | null) ?? null,
    mpesaReceiptNumber: (row.mpesa_receipt_number as string | null) ?? null,
    resultCode: (row.result_code as number | null) ?? null,
    resultDesc: (row.result_desc as string | null) ?? null,
    createdAt: `${row.created_at}`,
    updatedAt: `${row.updated_at}`
  };
}

function mapSubscription(row: Record<string, unknown>): SubscriptionRecord {
  return {
    id: `${row.id}`,
    userId: `${row.user_id}`,
    plan: row.plan as SubscriptionPlan,
    status: row.status as SubscriptionRecord["status"],
    amount: Number(row.amount),
    levelAccess: Array.isArray(row.level_access) ? (row.level_access as string[]) : [],
    startDate: (row.start_date as string | null) ?? null,
    endDate: (row.end_date as string | null) ?? null,
    createdAt: `${row.created_at}`,
    updatedAt: `${row.updated_at}`,
    paymentId: `${row.payment_id}`
  };
}

function mapSchemePurchase(row: Record<string, unknown>): SchemePurchaseRecord {
  return {
    id: `${row.id}`,
    userId: `${row.user_id}`,
    subject: `${row.subject}`,
    level: `${row.level}`,
    term: (row.term as SchemePurchaseRecord["term"] | null) ?? null,
    amount: Number(row.amount),
    status: row.status as SchemePurchaseRecord["status"],
    paymentId: `${row.payment_id}`,
    createdAt: `${row.created_at}`,
    updatedAt: `${row.updated_at}`
  };
}

function mapResource(row: Record<string, unknown>): ResourceRecord {
  return {
    id: `${row.id}`,
    title: `${row.title}`,
    description: `${row.description}`,
    level: `${row.level}`,
    subject: `${row.subject}`,
    category: row.category as ResourceRecord["category"],
    section: (row.section as ResourceRecord["section"] | null) ?? "notes",
    assessmentSet: (row.assessment_set as ResourceRecord["assessmentSet"] | null) ?? null,
    term: (row.term as ResourceRecord["term"] | null) ?? null,
    audience: row.audience as ResourceRecord["audience"],
    price: (row.price as number | null) ?? null,
    fileName: `${row.file_name}`,
    filePath: `${row.file_path}`,
    fileUrl: `${row.file_url}`,
    mimeType: `${row.mime_type}`,
    uploadedByUserId: `${row.uploaded_by_user_id}`,
    createdAt: `${row.created_at}`,
    updatedAt: `${row.updated_at}`
  };
}

export async function readAppData(): Promise<DataStore> {
  if (!isSupabaseConfigured()) {
    return readStore();
  }

  const supabase = getSupabaseAdmin();
  const [users, sessions, subscriptions, payments, schemePurchases, resources] = await Promise.all([
    supabase.from("users").select("*"),
    supabase.from("sessions").select("*"),
    supabase.from("subscriptions").select("*"),
    supabase.from("payments").select("*"),
    supabase.from("scheme_purchases").select("*"),
    supabase.from("resources").select("*")
  ]);

  if (users.error || sessions.error || subscriptions.error || payments.error || schemePurchases.error || resources.error) {
    throw new Error(
      users.error?.message ||
        sessions.error?.message ||
        subscriptions.error?.message ||
        payments.error?.message ||
        schemePurchases.error?.message ||
        resources.error?.message ||
        "Failed to read Supabase data."
    );
  }

  return {
    users: (users.data ?? []).map((row: Record<string, unknown>) => mapUser(row)),
    sessions: (sessions.data ?? []).map((row: Record<string, unknown>) => mapSession(row)),
    subscriptions: (subscriptions.data ?? []).map((row: Record<string, unknown>) => mapSubscription(row)),
    payments: (payments.data ?? []).map((row: Record<string, unknown>) => mapPayment(row)),
    schemePurchases: (schemePurchases.data ?? []).map((row: Record<string, unknown>) => mapSchemePurchase(row)),
    resources: (resources.data ?? []).map((row: Record<string, unknown>) => mapResource(row))
  };
}

export async function findUserByEmail(email: string) {
  if (!isSupabaseConfigured()) {
    const store = await readStore();
    return store.users.find((user) => user.email === email) ?? null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapUser(data) : null;
}

export async function findUserById(id: string) {
  if (!isSupabaseConfigured()) {
    const store = await readStore();
    return store.users.find((user) => user.id === id) ?? null;
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("users").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapUser(data) : null;
}

export async function insertUser(user: UserRecord) {
  if (!isSupabaseConfigured()) {
    await updateStore((current) => ({ ...current, users: [...current.users, user] }));
    return user;
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("users").insert({
    id: user.id,
    full_name: user.fullName,
    email: user.email,
    phone_number: user.phoneNumber,
    role: user.role,
    password_hash: user.passwordHash,
    password_salt: user.passwordSalt,
    created_at: user.createdAt
  });
  if (error) throw new Error(error.message);
  return user;
}

export async function findSessionByToken(token: string) {
  if (!isSupabaseConfigured()) {
    const store = await readStore();
    return store.sessions.find((session) => session.token === token) ?? null;
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("sessions").select("*").eq("token", token).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapSession(data) : null;
}

export async function replaceSessionForUser(session: SessionRecord) {
  if (!isSupabaseConfigured()) {
    await updateStore((current) => ({
      ...current,
      sessions: [...current.sessions.filter((item) => item.userId !== session.userId), session]
    }));
    return;
  }
  const supabase = getSupabaseAdmin();
  await supabase.from("sessions").delete().eq("user_id", session.userId);
  const { error } = await supabase.from("sessions").insert({
    token: session.token,
    user_id: session.userId,
    created_at: session.createdAt,
    expires_at: session.expiresAt
  });
  if (error) throw new Error(error.message);
}

export async function deleteSessionByToken(token: string) {
  if (!isSupabaseConfigured()) {
    await updateStore((current) => ({
      ...current,
      sessions: current.sessions.filter((session) => session.token !== token)
    }));
    return;
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("sessions").delete().eq("token", token);
  if (error) throw new Error(error.message);
}

export async function createSubscriptionPaymentBundle(input: {
  payment: PaymentRecord;
  subscription: SubscriptionRecord;
}) {
  if (!isSupabaseConfigured()) {
    await updateStore((current) => ({
      ...current,
      payments: [...current.payments, input.payment],
      subscriptions: [...current.subscriptions, input.subscription]
    }));
    return;
  }
  const supabase = getSupabaseAdmin();
  const paymentInsert = supabase.from("payments").insert(toPaymentRow(input.payment));
  const subscriptionInsert = supabase.from("subscriptions").insert(toSubscriptionRow(input.subscription));
  const [paymentRes, subscriptionRes] = await Promise.all([paymentInsert, subscriptionInsert]);
  if (paymentRes.error || subscriptionRes.error) {
    throw new Error(paymentRes.error?.message || subscriptionRes.error?.message || "Failed to create payment bundle.");
  }
}

export async function createSchemePaymentBundle(input: {
  payment: PaymentRecord;
  schemePurchase: SchemePurchaseRecord;
}) {
  if (!isSupabaseConfigured()) {
    await updateStore((current) => ({
      ...current,
      payments: [...current.payments, input.payment],
      schemePurchases: [...current.schemePurchases, input.schemePurchase]
    }));
    return;
  }
  const supabase = getSupabaseAdmin();
  const [paymentRes, schemeRes] = await Promise.all([
    supabase.from("payments").insert(toPaymentRow(input.payment)),
    supabase.from("scheme_purchases").insert(toSchemePurchaseRow(input.schemePurchase))
  ]);
  if (paymentRes.error || schemeRes.error) {
    throw new Error(paymentRes.error?.message || schemeRes.error?.message || "Failed to create scheme payment.");
  }
}

export async function updatePaymentById(paymentId: string, changes: Partial<PaymentRecord>) {
  if (!isSupabaseConfigured()) {
    await updateStore((current) => ({
      ...current,
      payments: current.payments.map((payment) =>
        payment.id === paymentId ? { ...payment, ...changes } : payment
      )
    }));
    return;
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("payments").update(toPaymentRow(changes)).eq("id", paymentId);
  if (error) throw new Error(error.message);
}

export async function findPaymentByReference(reference: string) {
  if (!isSupabaseConfigured()) {
    const store = await readStore();
    return store.payments.find((entry) => entry.paymentReference === reference || entry.id === reference) ?? null;
  }
  const supabase = getSupabaseAdmin();
  const byReference = await supabase.from("payments").select("*").eq("payment_reference", reference).maybeSingle();
  if (byReference.error && byReference.error.code !== "PGRST116") throw new Error(byReference.error.message);
  if (byReference.data) return mapPayment(byReference.data);
  const byId = await supabase.from("payments").select("*").eq("id", reference).maybeSingle();
  if (byId.error) throw new Error(byId.error.message);
  return byId.data ? mapPayment(byId.data) : null;
}

export async function markPaymentOutcome(paymentId: string, input: {
  paymentChanges: Partial<PaymentRecord>;
  subscriptionStatus?: Partial<SubscriptionRecord>;
  schemeStatus?: Partial<SchemePurchaseRecord>;
}) {
  if (!isSupabaseConfigured()) {
    await updateStore((current) => ({
      ...current,
      payments: current.payments.map((entry) =>
        entry.id === paymentId ? { ...entry, ...input.paymentChanges } : entry
      ),
      subscriptions: current.subscriptions.map((subscription) =>
        subscription.paymentId === paymentId && input.subscriptionStatus
          ? { ...subscription, ...input.subscriptionStatus }
          : subscription
      ),
      schemePurchases: current.schemePurchases.map((purchase) =>
        purchase.paymentId === paymentId && input.schemeStatus
          ? { ...purchase, ...input.schemeStatus }
          : purchase
      )
    }));
    return;
  }
  const supabase = getSupabaseAdmin();
  const updates = [
    supabase.from("payments").update(toPaymentRow(input.paymentChanges)).eq("id", paymentId)
  ];
  if (input.subscriptionStatus) {
    updates.push(
      supabase.from("subscriptions").update(toSubscriptionRow(input.subscriptionStatus)).eq("payment_id", paymentId)
    );
  }
  if (input.schemeStatus) {
    updates.push(
      supabase.from("scheme_purchases").update(toSchemePurchaseRow(input.schemeStatus)).eq("payment_id", paymentId)
    );
  }
  const results = await Promise.all(updates);
  for (const result of results as Array<{ error?: { message: string } | null }>) {
    if (result.error) throw new Error(result.error.message);
  }
}

export async function saveResourceRecord(resource: ResourceRecord) {
  if (!isSupabaseConfigured()) {
    await updateStore((current) => ({ ...current, resources: [resource, ...current.resources] }));
    return resource;
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("resources").insert({
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
    file_path: resource.filePath,
    file_url: resource.fileUrl,
    mime_type: resource.mimeType,
    uploaded_by_user_id: resource.uploadedByUserId,
    created_at: resource.createdAt,
    updated_at: resource.updatedAt
  });
  if (error) throw new Error(error.message);
  return resource;
}

export async function updateResourceRecord(resourceId: string, changes: Partial<ResourceRecord>) {
  if (!isSupabaseConfigured()) {
    let updatedResource: ResourceRecord | null = null;
    await updateStore((current) => ({
      ...current,
      resources: current.resources.map((resource) => {
        if (resource.id !== resourceId) return resource;
        updatedResource = {
          ...resource,
          ...changes,
          id: resource.id
        };
        return updatedResource;
      })
    }));
    return updatedResource;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("resources")
    .update({
      ...(changes.title !== undefined ? { title: changes.title } : {}),
      ...(changes.description !== undefined ? { description: changes.description } : {}),
      ...(changes.level !== undefined ? { level: changes.level } : {}),
      ...(changes.subject !== undefined ? { subject: changes.subject } : {}),
      ...(changes.category !== undefined ? { category: changes.category } : {}),
      ...(changes.section !== undefined ? { section: changes.section } : {}),
      ...(changes.assessmentSet !== undefined ? { assessment_set: changes.assessmentSet } : {}),
      ...(changes.term !== undefined ? { term: changes.term } : {}),
      ...(changes.audience !== undefined ? { audience: changes.audience } : {}),
      ...(changes.price !== undefined ? { price: changes.price } : {}),
      ...(changes.fileName !== undefined ? { file_name: changes.fileName } : {}),
      ...(changes.filePath !== undefined ? { file_path: changes.filePath } : {}),
      ...(changes.fileUrl !== undefined ? { file_url: changes.fileUrl } : {}),
      ...(changes.mimeType !== undefined ? { mime_type: changes.mimeType } : {}),
      ...(changes.uploadedByUserId !== undefined ? { uploaded_by_user_id: changes.uploadedByUserId } : {}),
      ...(changes.updatedAt !== undefined ? { updated_at: changes.updatedAt } : {})
    })
    .eq("id", resourceId)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapResource(data) : null;
}

export async function deleteResourceRecord(resourceId: string) {
  if (!isSupabaseConfigured()) {
    let deletedResource: ResourceRecord | null = null;
    await updateStore((current) => ({
      ...current,
      resources: current.resources.filter((resource) => {
        if (resource.id === resourceId) {
          deletedResource = resource;
          return false;
        }
        return true;
      })
    }));
    return deletedResource;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("resources").delete().eq("id", resourceId).select("*").maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapResource(data) : null;
}

export async function uploadResourceFile(filePath: string, fileBuffer: Buffer, mimeType: string) {
  const supabase = getSupabaseAdmin();
  const bucket = getSupabaseBucket();
  const { error } = await supabase.storage.from(bucket).upload(filePath, fileBuffer, {
    contentType: mimeType,
    upsert: false
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function createSignedResourceUpload(filePath: string) {
  const supabase = getSupabaseAdmin();
  const bucket = getSupabaseBucket();
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(filePath);
  if (error) throw new Error(error.message);
  return data;
}

export function getResourceFilePublicUrl(filePath: string) {
  const supabase = getSupabaseAdmin();
  const bucket = getSupabaseBucket();
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function deleteResourceFile(filePath: string) {
  if (!filePath) return;

  if (!isSupabaseConfigured()) {
    const absolutePath = path.join(process.cwd(), filePath);
    try {
      await fs.unlink(absolutePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
    return;
  }

  const supabase = getSupabaseAdmin();
  const bucket = getSupabaseBucket();
  const { error } = await supabase.storage.from(bucket).remove([filePath]);
  if (error && !error.message.toLowerCase().includes("not found")) {
    throw new Error(error.message);
  }
}

function toPaymentRow(payment: Partial<PaymentRecord>) {
  return {
    ...(payment.id ? { id: payment.id } : {}),
    ...(payment.userId ? { user_id: payment.userId } : {}),
    ...(payment.kind ? { kind: payment.kind } : {}),
    ...(payment.status ? { status: payment.status } : {}),
    ...(payment.provider ? { provider: payment.provider } : {}),
    ...(payment.currency ? { currency: payment.currency } : {}),
    ...(typeof payment.amount === "number" ? { amount: payment.amount } : {}),
    ...(payment.phoneNumber !== undefined ? { phone_number: payment.phoneNumber } : {}),
    ...(payment.accountReference !== undefined ? { account_reference: payment.accountReference } : {}),
    ...(payment.plan !== undefined ? { plan: payment.plan } : {}),
    ...(payment.schemeSubject !== undefined ? { scheme_subject: payment.schemeSubject } : {}),
    ...(payment.schemeLevel !== undefined ? { scheme_level: payment.schemeLevel } : {}),
    ...(payment.schemeTerm !== undefined ? { scheme_term: payment.schemeTerm } : {}),
    ...(payment.paymentReference !== undefined ? { payment_reference: payment.paymentReference } : {}),
    ...(payment.authorizationUrl !== undefined ? { authorization_url: payment.authorizationUrl } : {}),
    ...(payment.checkoutRequestId !== undefined ? { checkout_request_id: payment.checkoutRequestId } : {}),
    ...(payment.merchantRequestId !== undefined ? { merchant_request_id: payment.merchantRequestId } : {}),
    ...(payment.mpesaReceiptNumber !== undefined ? { mpesa_receipt_number: payment.mpesaReceiptNumber } : {}),
    ...(payment.resultCode !== undefined ? { result_code: payment.resultCode } : {}),
    ...(payment.resultDesc !== undefined ? { result_desc: payment.resultDesc } : {}),
    ...(payment.createdAt ? { created_at: payment.createdAt } : {}),
    ...(payment.updatedAt ? { updated_at: payment.updatedAt } : {})
  };
}

function toSubscriptionRow(subscription: Partial<SubscriptionRecord>) {
  return {
    ...(subscription.id ? { id: subscription.id } : {}),
    ...(subscription.userId ? { user_id: subscription.userId } : {}),
    ...(subscription.plan ? { plan: subscription.plan } : {}),
    ...(subscription.status ? { status: subscription.status } : {}),
    ...(typeof subscription.amount === "number" ? { amount: subscription.amount } : {}),
    ...(subscription.levelAccess ? { level_access: subscription.levelAccess } : {}),
    ...(subscription.startDate !== undefined ? { start_date: subscription.startDate } : {}),
    ...(subscription.endDate !== undefined ? { end_date: subscription.endDate } : {}),
    ...(subscription.createdAt ? { created_at: subscription.createdAt } : {}),
    ...(subscription.updatedAt ? { updated_at: subscription.updatedAt } : {}),
    ...(subscription.paymentId ? { payment_id: subscription.paymentId } : {})
  };
}

function toSchemePurchaseRow(purchase: Partial<SchemePurchaseRecord>) {
  return {
    ...(purchase.id ? { id: purchase.id } : {}),
    ...(purchase.userId ? { user_id: purchase.userId } : {}),
    ...(purchase.subject ? { subject: purchase.subject } : {}),
    ...(purchase.level ? { level: purchase.level } : {}),
    ...(purchase.term !== undefined ? { term: purchase.term } : {}),
    ...(typeof purchase.amount === "number" ? { amount: purchase.amount } : {}),
    ...(purchase.status ? { status: purchase.status } : {}),
    ...(purchase.paymentId ? { payment_id: purchase.paymentId } : {}),
    ...(purchase.createdAt ? { created_at: purchase.createdAt } : {}),
    ...(purchase.updatedAt ? { updated_at: purchase.updatedAt } : {})
  };
}
