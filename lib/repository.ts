import { promises as fs } from "fs";
import path from "path";
import type {
  DataStore,
  GeneratedSchemeRecord,
  PaymentRecord,
  PasswordResetTokenRecord,
  PropertyRecord,
  ResourceRecord,
  ResourcePurchaseRecord,
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

function mapPasswordResetToken(row: Record<string, unknown>): PasswordResetTokenRecord {
  return {
    id: `${row.id}`,
    userId: `${row.user_id}`,
    tokenHash: `${row.token_hash}`,
    createdAt: `${row.created_at}`,
    expiresAt: `${row.expires_at}`,
    usedAt: (row.used_at as string | null) ?? null,
    attempts: Number(row.attempts ?? 0)
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
    resourceId: (row.resource_id as string | null) ?? null,
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
    resourceId: (row.resource_id as string | null) ?? null,
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

function mapResourcePurchase(row: Record<string, unknown>): ResourcePurchaseRecord {
  return {
    id: `${row.id}`,
    userId: `${row.user_id}`,
    resourceId: `${row.resource_id}`,
    title: `${row.title}`,
    level: `${row.level}`,
    subject: `${row.subject}`,
    section: row.section as ResourcePurchaseRecord["section"],
    assessmentSet: (row.assessment_set as ResourcePurchaseRecord["assessmentSet"] | null) ?? null,
    amount: Number(row.amount),
    status: row.status as ResourcePurchaseRecord["status"],
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

function mapGeneratedScheme(row: Record<string, unknown>): GeneratedSchemeRecord {
  return {
    id: `${row.id}`,
    userId: `${row.user_id}`,
    title: `${row.title}`,
    level: `${row.level}`,
    stage: `${row.stage}`,
    subject: `${row.subject}`,
    term: row.term as GeneratedSchemeRecord["term"],
    schoolName: `${row.school_name ?? ""}`,
    className: `${row.class_name ?? ""}`,
    strand: `${row.strand}`,
    subStrand: `${row.sub_strand}`,
    weeksCount: Number(row.weeks_count),
    lessonsPerWeek: Number(row.lessons_per_week),
    learningOutcomes: Array.isArray(row.learning_outcomes) ? (row.learning_outcomes as string[]) : [],
    keyInquiryQuestions: Array.isArray(row.key_inquiry_questions) ? (row.key_inquiry_questions as string[]) : [],
    coreCompetencies: Array.isArray(row.core_competencies) ? (row.core_competencies as string[]) : [],
    values: Array.isArray(row.values) ? (row.values as string[]) : [],
    pertinentIssues: Array.isArray(row.pertinent_issues) ? (row.pertinent_issues as string[]) : [],
    resources: Array.isArray(row.resources) ? (row.resources as string[]) : [],
    assessmentMethods: Array.isArray(row.assessment_methods) ? (row.assessment_methods as string[]) : [],
    notes: `${row.notes ?? ""}`,
    weeklyPlan: Array.isArray(row.weekly_plan)
      ? (row.weekly_plan as GeneratedSchemeRecord["weeklyPlan"])
      : [],
    createdAt: `${row.created_at}`,
    updatedAt: `${row.updated_at}`
  };
}

function isMissingGeneratedSchemesTable(error: { message?: string | null; code?: string | null } | null) {
  if (!error) {
    return false;
  }

  const message = `${error.message ?? ""}`.toLowerCase();
  return (
    error.code === "42P01" ||
    message.includes("generated_schemes") &&
      (message.includes("schema cache") ||
        message.includes("does not exist") ||
        message.includes("could not find the table"))
  );
}

export async function readAppData(): Promise<DataStore> {
  if (!isSupabaseConfigured()) {
    return readStore();
  }

  const localStore = await readStore();

  const supabase = getSupabaseAdmin();
  const [users, sessions, subscriptions, payments, schemePurchases, resourcePurchases, resources, generatedSchemes] = await Promise.all([
    supabase.from("users").select("*"),
    supabase.from("sessions").select("*"),
    supabase.from("subscriptions").select("*"),
    supabase.from("payments").select("*"),
    supabase.from("scheme_purchases").select("*"),
    supabase.from("resource_purchases").select("*"),
    supabase.from("resources").select("*"),
    supabase.from("generated_schemes").select("*")
  ]);

  if (
    users.error ||
    sessions.error ||
    subscriptions.error ||
    payments.error ||
    schemePurchases.error ||
    resourcePurchases.error ||
    resources.error ||
    (generatedSchemes.error && !isMissingGeneratedSchemesTable(generatedSchemes.error))
  ) {
    throw new Error(
      users.error?.message ||
        sessions.error?.message ||
        subscriptions.error?.message ||
        payments.error?.message ||
        schemePurchases.error?.message ||
        resourcePurchases.error?.message ||
        resources.error?.message ||
        (isMissingGeneratedSchemesTable(generatedSchemes.error) ? null : generatedSchemes.error?.message) ||
        "Failed to read Supabase data."
    );
  }

  return {
    users: (users.data ?? []).map((row: Record<string, unknown>) => mapUser(row)),
    sessions: (sessions.data ?? []).map((row: Record<string, unknown>) => mapSession(row)),
    passwordResetTokens: [],
    subscriptions: (subscriptions.data ?? []).map((row: Record<string, unknown>) => mapSubscription(row)),
    payments: (payments.data ?? []).map((row: Record<string, unknown>) => mapPayment(row)),
    schemePurchases: (schemePurchases.data ?? []).map((row: Record<string, unknown>) => mapSchemePurchase(row)),
    resourcePurchases: (resourcePurchases.data ?? []).map((row: Record<string, unknown>) => mapResourcePurchase(row)),
    generatedSchemes: isMissingGeneratedSchemesTable(generatedSchemes.error)
      ? localStore.generatedSchemes ?? []
      : (generatedSchemes.data ?? []).map((row: Record<string, unknown>) => mapGeneratedScheme(row)),
    resources: (resources.data ?? []).map((row: Record<string, unknown>) => mapResource(row)),
    properties: localStore.properties ?? []
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

export async function updateUserPassword(input: {
  userId: string;
  passwordHash: string;
  passwordSalt: string;
}) {
  if (!isSupabaseConfigured()) {
    await updateStore((current) => ({
      ...current,
      users: current.users.map((user) =>
        user.id === input.userId
          ? {
              ...user,
              passwordHash: input.passwordHash,
              passwordSalt: input.passwordSalt
            }
          : user
      )
    }));
    return;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("users")
    .update({
      password_hash: input.passwordHash,
      password_salt: input.passwordSalt
    })
    .eq("id", input.userId);

  if (error) throw new Error(error.message);
}

export async function updateUserRole(input: {
  userId: string;
  role: UserRecord["role"];
}) {
  if (!isSupabaseConfigured()) {
    await updateStore((current) => ({
      ...current,
      users: current.users.map((user) =>
        user.id === input.userId
          ? {
              ...user,
              role: input.role
            }
          : user
      )
    }));
    return;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("users")
    .update({
      role: input.role
    })
    .eq("id", input.userId);

  if (error) throw new Error(error.message);
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

export async function insertPasswordResetToken(token: PasswordResetTokenRecord) {
  if (!isSupabaseConfigured()) {
    await updateStore((current) => ({
      ...current,
      passwordResetTokens: [token, ...current.passwordResetTokens]
    }));
    return token;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("password_reset_tokens").insert(
    toPasswordResetTokenRow(token)
  );
  if (error) throw new Error(error.message);
  return token;
}

export async function findLatestPasswordResetTokenByUserId(userId: string) {
  if (!isSupabaseConfigured()) {
    const store = await readStore();
    return (
      store.passwordResetTokens
        .filter((token) => token.userId === userId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null
    );
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("password_reset_tokens")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapPasswordResetToken(data) : null;
}

export async function findPasswordResetTokenByHash(tokenHash: string) {
  if (!isSupabaseConfigured()) {
    const store = await readStore();
    return store.passwordResetTokens.find((token) => token.tokenHash === tokenHash) ?? null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("password_reset_tokens")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapPasswordResetToken(data) : null;
}

export async function deletePasswordResetTokensByUserId(userId: string) {
  if (!isSupabaseConfigured()) {
    await updateStore((current) => ({
      ...current,
      passwordResetTokens: current.passwordResetTokens.filter((token) => token.userId !== userId)
    }));
    return;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("password_reset_tokens").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function updatePasswordResetToken(
  tokenId: string,
  changes: Partial<PasswordResetTokenRecord>
) {
  if (!isSupabaseConfigured()) {
    await updateStore((current) => ({
      ...current,
      passwordResetTokens: current.passwordResetTokens.map((token) =>
        token.id === tokenId ? { ...token, ...changes } : token
      )
    }));
    return;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("password_reset_tokens")
    .update(toPasswordResetTokenRow(changes))
    .eq("id", tokenId);

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
  const paymentRes = await supabase.from("payments").insert(toPaymentRow(input.payment));
  if (paymentRes.error) {
    throw new Error(paymentRes.error.message);
  }

  const subscriptionRes = await supabase
    .from("subscriptions")
    .insert(toSubscriptionRow(input.subscription));
  if (subscriptionRes.error) {
    await supabase.from("payments").delete().eq("id", input.payment.id);
    throw new Error(subscriptionRes.error.message || "Failed to create payment bundle.");
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
  const paymentRes = await supabase.from("payments").insert(toPaymentRow(input.payment));
  if (paymentRes.error) {
    throw new Error(paymentRes.error.message);
  }

  const schemeRes = await supabase
    .from("scheme_purchases")
    .insert(toSchemePurchaseRow(input.schemePurchase));
  if (schemeRes.error) {
    await supabase.from("payments").delete().eq("id", input.payment.id);
    throw new Error(schemeRes.error.message || "Failed to create scheme payment.");
  }
}

export async function createResourcePaymentBundle(input: {
  payment: PaymentRecord;
  resourcePurchase: ResourcePurchaseRecord;
}) {
  if (!isSupabaseConfigured()) {
    await updateStore((current) => ({
      ...current,
      payments: [...current.payments, input.payment],
      resourcePurchases: [...current.resourcePurchases, input.resourcePurchase]
    }));
    return;
  }
  const supabase = getSupabaseAdmin();
  const paymentRes = await supabase.from("payments").insert(toPaymentRow(input.payment));
  if (paymentRes.error) {
    throw new Error(paymentRes.error.message);
  }

  const resourceRes = await supabase
    .from("resource_purchases")
    .insert(toResourcePurchaseRow(input.resourcePurchase));
  if (resourceRes.error) {
    await supabase.from("payments").delete().eq("id", input.payment.id);
    throw new Error(resourceRes.error.message || "Failed to create resource payment.");
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

export async function savePaymentRecord(payment: PaymentRecord) {
  if (!isSupabaseConfigured()) {
    await updateStore((current) => ({
      ...current,
      payments: [...current.payments, payment]
    }));
    return payment;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("payments").insert(toPaymentRow(payment));
  if (error) throw new Error(error.message);
  return payment;
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
  resourceStatus?: Partial<ResourcePurchaseRecord>;
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
      ),
      resourcePurchases: current.resourcePurchases.map((purchase) =>
        purchase.paymentId === paymentId && input.resourceStatus
          ? { ...purchase, ...input.resourceStatus }
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
  if (input.resourceStatus) {
    updates.push(
      supabase.from("resource_purchases").update(toResourcePurchaseRow(input.resourceStatus)).eq("payment_id", paymentId)
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

export async function saveGeneratedSchemeRecord(scheme: GeneratedSchemeRecord) {
  if (!isSupabaseConfigured()) {
    await updateStore((current) => ({
      ...current,
      generatedSchemes: [scheme, ...current.generatedSchemes]
    }));
    return scheme;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("generated_schemes").insert(toGeneratedSchemeRow(scheme));
  if (error) throw new Error(error.message);
  return scheme;
}

export async function deleteGeneratedSchemeRecord(schemeId: string) {
  if (!isSupabaseConfigured()) {
    let deletedScheme: GeneratedSchemeRecord | null = null;
    await updateStore((current) => ({
      ...current,
      generatedSchemes: current.generatedSchemes.filter((scheme) => {
        if (scheme.id === schemeId) {
          deletedScheme = scheme;
          return false;
        }
        return true;
      })
    }));
    return deletedScheme;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("generated_schemes")
    .delete()
    .eq("id", schemeId)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapGeneratedScheme(data) : null;
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

export async function savePropertyRecord(property: PropertyRecord) {
  await updateStore((current) => ({
    ...current,
    properties: [property, ...current.properties]
  }));

  return property;
}

export async function updatePropertyRecord(propertyId: string, changes: Partial<PropertyRecord>) {
  let updatedProperty: PropertyRecord | null = null;

  await updateStore((current) => ({
    ...current,
    properties: current.properties.map((property) => {
      if (property.id !== propertyId) {
        return property;
      }

      updatedProperty = {
        ...property,
        ...changes,
        id: property.id
      };

      return updatedProperty;
    })
  }));

  return updatedProperty;
}

export async function deletePropertyRecord(propertyId: string) {
  let deletedProperty: PropertyRecord | null = null;

  await updateStore((current) => ({
    ...current,
    properties: current.properties.filter((property) => {
      if (property.id === propertyId) {
        deletedProperty = property;
        return false;
      }

      return true;
    })
  }));

  return deletedProperty;
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
    ...(payment.resourceId !== undefined ? { resource_id: payment.resourceId } : {}),
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

function toPasswordResetTokenRow(token: Partial<PasswordResetTokenRecord>) {
  return {
    ...(token.id ? { id: token.id } : {}),
    ...(token.userId ? { user_id: token.userId } : {}),
    ...(token.tokenHash ? { token_hash: token.tokenHash } : {}),
    ...(token.createdAt ? { created_at: token.createdAt } : {}),
    ...(token.expiresAt ? { expires_at: token.expiresAt } : {}),
    ...(token.usedAt !== undefined ? { used_at: token.usedAt } : {}),
    ...(typeof token.attempts === "number" ? { attempts: token.attempts } : {})
  };
}

function toSchemePurchaseRow(purchase: Partial<SchemePurchaseRecord>) {
  return {
    ...(purchase.id ? { id: purchase.id } : {}),
    ...(purchase.userId ? { user_id: purchase.userId } : {}),
    ...(purchase.resourceId !== undefined ? { resource_id: purchase.resourceId } : {}),
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

function toResourcePurchaseRow(purchase: Partial<ResourcePurchaseRecord>) {
  return {
    ...(purchase.id ? { id: purchase.id } : {}),
    ...(purchase.userId ? { user_id: purchase.userId } : {}),
    ...(purchase.resourceId ? { resource_id: purchase.resourceId } : {}),
    ...(purchase.title ? { title: purchase.title } : {}),
    ...(purchase.level ? { level: purchase.level } : {}),
    ...(purchase.subject ? { subject: purchase.subject } : {}),
    ...(purchase.section ? { section: purchase.section } : {}),
    ...(purchase.assessmentSet !== undefined ? { assessment_set: purchase.assessmentSet } : {}),
    ...(typeof purchase.amount === "number" ? { amount: purchase.amount } : {}),
    ...(purchase.status ? { status: purchase.status } : {}),
    ...(purchase.paymentId ? { payment_id: purchase.paymentId } : {}),
    ...(purchase.createdAt ? { created_at: purchase.createdAt } : {}),
    ...(purchase.updatedAt ? { updated_at: purchase.updatedAt } : {})
  };
}

function toGeneratedSchemeRow(scheme: Partial<GeneratedSchemeRecord>) {
  return {
    ...(scheme.id ? { id: scheme.id } : {}),
    ...(scheme.userId ? { user_id: scheme.userId } : {}),
    ...(scheme.title ? { title: scheme.title } : {}),
    ...(scheme.level ? { level: scheme.level } : {}),
    ...(scheme.stage ? { stage: scheme.stage } : {}),
    ...(scheme.subject ? { subject: scheme.subject } : {}),
    ...(scheme.term ? { term: scheme.term } : {}),
    ...(scheme.schoolName !== undefined ? { school_name: scheme.schoolName } : {}),
    ...(scheme.className !== undefined ? { class_name: scheme.className } : {}),
    ...(scheme.strand ? { strand: scheme.strand } : {}),
    ...(scheme.subStrand ? { sub_strand: scheme.subStrand } : {}),
    ...(typeof scheme.weeksCount === "number" ? { weeks_count: scheme.weeksCount } : {}),
    ...(typeof scheme.lessonsPerWeek === "number" ? { lessons_per_week: scheme.lessonsPerWeek } : {}),
    ...(scheme.learningOutcomes ? { learning_outcomes: scheme.learningOutcomes } : {}),
    ...(scheme.keyInquiryQuestions ? { key_inquiry_questions: scheme.keyInquiryQuestions } : {}),
    ...(scheme.coreCompetencies ? { core_competencies: scheme.coreCompetencies } : {}),
    ...(scheme.values ? { values: scheme.values } : {}),
    ...(scheme.pertinentIssues ? { pertinent_issues: scheme.pertinentIssues } : {}),
    ...(scheme.resources ? { resources: scheme.resources } : {}),
    ...(scheme.assessmentMethods ? { assessment_methods: scheme.assessmentMethods } : {}),
    ...(scheme.notes !== undefined ? { notes: scheme.notes } : {}),
    ...(scheme.weeklyPlan ? { weekly_plan: scheme.weeklyPlan } : {}),
    ...(scheme.createdAt ? { created_at: scheme.createdAt } : {}),
    ...(scheme.updatedAt ? { updated_at: scheme.updatedAt } : {})
  };
}
