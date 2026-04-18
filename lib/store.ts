import { promises as fs } from "fs";
import path from "path";

export type UserRole = "parent" | "teacher" | "admin";

export type UserRecord = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
};

export type SessionRecord = {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
};

export type PasswordResetTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  attempts: number;
};

export type SubscriptionPlan = "parent-monthly" | "teacher-monthly";
export type PaymentStatus = "pending" | "paid" | "failed";

export type SubscriptionRecord = {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: "pending" | "active" | "expired" | "failed";
  amount: number;
  levelAccess: string[];
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  paymentId: string;
};

export type PaymentKind =
  | "subscription"
  | "scheme"
  | "resource"
  | "tool-access"
  | "generated-scheme"
  | "generated-lesson-plan";
export type SchemeTerm = "term-1" | "term-2" | "term-3";

export type PaymentRecord = {
  id: string;
  userId: string;
  kind: PaymentKind;
  status: PaymentStatus;
  provider?: "mpesa" | "paystack";
  currency?: string;
  amount: number;
  phoneNumber: string;
  accountReference: string;
  plan: SubscriptionPlan | null;
  schemeSubject: string | null;
  schemeLevel: string | null;
  schemeTerm: SchemeTerm | null;
  resourceId: string | null;
  paymentReference?: string | null;
  authorizationUrl?: string | null;
  checkoutRequestId: string | null;
  merchantRequestId: string | null;
  mpesaReceiptNumber: string | null;
  resultCode: number | null;
  resultDesc: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SchemePurchaseRecord = {
  id: string;
  userId: string;
  resourceId: string | null;
  subject: string;
  level: string;
  term: SchemeTerm | null;
  amount: number;
  status: "pending" | "paid" | "failed";
  paymentId: string;
  createdAt: string;
  updatedAt: string;
};

export type ResourcePurchaseRecord = {
  id: string;
  userId: string;
  resourceId: string;
  title: string;
  level: string;
  subject: string;
  section: ResourceSection;
  assessmentSet: AssessmentSet | null;
  amount: number;
  status: "pending" | "paid" | "failed";
  paymentId: string;
  createdAt: string;
  updatedAt: string;
};

export type ResourceCategory = "revision-material" | "scheme-of-work";
export type ResourceSection = "notes" | "assessment";
export type AssessmentSet = "set-1" | "set-2" | "set-3" | "cekena-exams";

export type GeneratedSchemeWeekRecord = {
  weekNumber: number;
  lessonRange: string;
  focus: string;
  learningOutcome: string;
  learnerActivities: string[];
  resources: string[];
  assessment: string;
  remarks: string;
};

export type GeneratedSchemeRecord = {
  id: string;
  userId: string;
  title: string;
  level: string;
  stage: string;
  subject: string;
  term: SchemeTerm;
  schoolName: string;
  className: string;
  strand: string;
  subStrand: string;
  weeksCount: number;
  lessonsPerWeek: number;
  learningOutcomes: string[];
  keyInquiryQuestions: string[];
  coreCompetencies: string[];
  values: string[];
  pertinentIssues: string[];
  resources: string[];
  assessmentMethods: string[];
  notes: string;
  weeklyPlan: GeneratedSchemeWeekRecord[];
  createdAt: string;
  updatedAt: string;
};

export type GeneratedSchemeRequestPayload = {
  schoolName: string;
  className: string;
  level: string;
  subject: string;
  term: SchemeTerm;
  strand: string;
  subStrand: string;
  weeksCount: number;
  lessonsPerWeek: number;
  learningOutcomes: string[];
  keyInquiryQuestions: string[];
  coreCompetencies: string[];
  values: string[];
  pertinentIssues: string[];
  resources: string[];
  assessmentMethods: string[];
  notes: string;
};

export type GeneratedSchemeRequestRecord = {
  id: string;
  userId: string;
  paymentId: string;
  status: "pending" | "paid" | "failed" | "completed";
  payload: GeneratedSchemeRequestPayload;
  generatedSchemeId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GeneratedLessonPlanRecord = {
  id: string;
  userId: string;
  title: string;
  level: string;
  stage: string;
  subject: string;
  unitTitle: string;
  subStrands: string[];
  selectedCount: number;
  learningObjectives: string[];
  keyQuestions: string[];
  learnerActivities: string[];
  resources: string[];
  assessmentMethods: string[];
  reflection: string;
  homework: string;
  createdAt: string;
  updatedAt: string;
};

export type GeneratedLessonPlanRequestPayload = {
  level: string;
  subject: string;
  unitTitle: string;
  subStrands: string[];
  selectedCount: number;
  schoolName?: string;
  roll?: string;
  lessonTime?: string;
  year?: string;
  term?: string;
  lessonDate?: string;
  teacherName?: string;
  tscNumber?: string;
};

export type GeneratedLessonPlanRequestRecord = {
  id: string;
  userId: string;
  paymentId: string;
  status: "pending" | "paid" | "failed" | "completed";
  payload: GeneratedLessonPlanRequestPayload;
  generatedLessonPlanId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ResourceRecord = {
  id: string;
  title: string;
  description: string;
  level: string;
  subject: string;
  category: ResourceCategory;
  section?: ResourceSection;
  assessmentSet?: AssessmentSet | null;
  term?: SchemeTerm | null;
  audience: "parent" | "teacher" | "both";
  price: number | null;
  fileName: string;
  filePath: string;
  fileUrl: string;
  mimeType: string;
  uploadedByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type PropertyStatus = "Completed" | "Selling fast" | "Now booking";
export type PropertyCategory = "Villa" | "Maisonette" | "Apartment" | "Townhouse";

export type PropertyRecord = {
  id: string;
  slug: string;
  title: string;
  location: string;
  county: string;
  status: PropertyStatus;
  category: PropertyCategory;
  price: string;
  bedrooms: number;
  bathrooms: number;
  area: string;
  plotSize: string;
  completion: string;
  financing: string;
  heroImage: string;
  gallery: string[];
  summary: string;
  description: string;
  features: string[];
  nearby: string[];
  tags: string[];
  uploadedByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type DataStore = {
  users: UserRecord[];
  sessions: SessionRecord[];
  passwordResetTokens: PasswordResetTokenRecord[];
  subscriptions: SubscriptionRecord[];
  payments: PaymentRecord[];
  schemePurchases: SchemePurchaseRecord[];
  resourcePurchases: ResourcePurchaseRecord[];
  generatedSchemeRequests: GeneratedSchemeRequestRecord[];
  generatedSchemes: GeneratedSchemeRecord[];
  generatedLessonPlanRequests: GeneratedLessonPlanRequestRecord[];
  generatedLessonPlans: GeneratedLessonPlanRecord[];
  resources: ResourceRecord[];
  properties: PropertyRecord[];
};

const storePath = path.join(process.cwd(), "data", "store.json");
let writeQueue = Promise.resolve();

async function ensureStoreFile() {
  await fs.mkdir(path.dirname(storePath), { recursive: true });

  try {
    await fs.access(storePath);
  } catch {
    await fs.writeFile(
      storePath,
      JSON.stringify(
        {
          users: [],
          sessions: [],
          passwordResetTokens: [],
          subscriptions: [],
          payments: [],
          schemePurchases: [],
          resourcePurchases: [],
          generatedSchemeRequests: [],
          generatedSchemes: [],
          generatedLessonPlanRequests: [],
          generatedLessonPlans: [],
          resources: [],
          properties: []
        } satisfies DataStore,
        null,
        2
      )
    );
  }
}

export async function readStore(): Promise<DataStore> {
  await ensureStoreFile();
  const raw = await fs.readFile(storePath, "utf8");
  const parsed = JSON.parse(raw) as Partial<DataStore>;

  return {
    users: parsed.users ?? [],
    sessions: parsed.sessions ?? [],
    passwordResetTokens: parsed.passwordResetTokens ?? [],
    subscriptions: parsed.subscriptions ?? [],
    payments: parsed.payments ?? [],
    schemePurchases: parsed.schemePurchases ?? [],
    resourcePurchases: parsed.resourcePurchases ?? [],
    generatedSchemeRequests: parsed.generatedSchemeRequests ?? [],
    generatedSchemes: parsed.generatedSchemes ?? [],
    generatedLessonPlanRequests: parsed.generatedLessonPlanRequests ?? [],
    generatedLessonPlans: parsed.generatedLessonPlans ?? [],
    resources: parsed.resources ?? [],
    properties: parsed.properties ?? []
  };
}

export async function writeStore(store: DataStore) {
  await ensureStoreFile();

  writeQueue = writeQueue.then(() =>
    fs.writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf8")
  );

  return writeQueue;
}

export async function updateStore(
  updater: (store: DataStore) => DataStore | Promise<DataStore>
) {
  let resolvedStore: DataStore | null = null;

  writeQueue = writeQueue.then(async () => {
    const current = await readStore();
    const next = await updater(current);
    await fs.writeFile(storePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    resolvedStore = next;
  });

  await writeQueue;
  return resolvedStore!;
}
