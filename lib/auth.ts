import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionRecord, UserRecord, UserRole } from "@/lib/store";
import {
  deleteSessionByToken,
  deletePasswordResetTokensByUserId,
  findSessionByToken,
  findPasswordResetTokenByHash,
  findUserByEmail,
  findUserById,
  insertUser,
  insertPasswordResetToken,
  replaceSessionForUser,
  updateUserPassword
} from "@/lib/repository";
import { sendPasswordResetEmail } from "@/lib/email";

const sessionCookieName = "teacher_mwangi_session";
const socialProfileCookieName = "teacher_mwangi_social_profile";
const sessionDurationMs = 1000 * 60 * 60 * 24 * 30;
const passwordResetDurationMs = 1000 * 60 * 60;
const socialProfileDurationMs = 1000 * 60 * 30;

function getSecret() {
  return process.env.JWT_SECRET || "teacher-mwangi-academy-dev-secret";
}

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(expectedHash, "hex"));
}

export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(`${token}.${getSecret()}`).digest("hex");
}

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

function signValue(value: string) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
}

function encodeSignedValue(value: string) {
  return `${value}.${signValue(value)}`;
}

function decodeSignedValue(raw: string | undefined) {
  if (!raw) {
    return null;
  }

  const [value, signature] = raw.split(".");

  if (!value || !signature) {
    return null;
  }

  if (signValue(value) !== signature) {
    return null;
  }

  return value;
}

function encodeSessionToken(token: string) {
  return encodeSignedValue(token);
}

function decodeSessionToken(raw: string | undefined) {
  return decodeSignedValue(raw);
}

type PendingSocialProfile = {
  email: string;
  fullName: string;
  provider: "google";
  createdAt: string;
};

function encodePendingSocialProfile(profile: PendingSocialProfile) {
  return encodeSignedValue(Buffer.from(JSON.stringify(profile), "utf8").toString("base64url"));
}

function decodePendingSocialProfile(raw: string | undefined) {
  const value = decodeSignedValue(raw);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as PendingSocialProfile;
  } catch {
    return null;
  }
}

export async function createUser(input: {
  fullName: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
  password: string;
}) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    throw new Error("An account with that email already exists.");
  }
  const { hash, salt } = hashPassword(input.password);
  const user: UserRecord = {
    id: createId("user"),
    fullName: input.fullName.trim(),
    email: normalizedEmail,
    phoneNumber: input.phoneNumber.trim(),
    role: input.role,
    passwordHash: hash,
    passwordSalt: salt,
    createdAt: new Date().toISOString()
  };
  await insertUser(user);
  return user;
}

export async function createSocialUser(input: {
  fullName: string;
  email: string;
  phoneNumber: string;
  role: Exclude<UserRole, "admin">;
}) {
  return createUser({
    ...input,
    password: crypto.randomBytes(32).toString("hex")
  });
}

export async function authenticateUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    return null;
  }

  if (!verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    return null;
  }

  return user;
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    return {
      requested: true,
      previewUrl: null as string | null,
      emailSent: false
    };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + passwordResetDurationMs).toISOString();
  const resetUrl = `${getSiteUrl()}/reset-password?token=${rawToken}`;

  await deletePasswordResetTokensByUserId(user.id);
  await insertPasswordResetToken({
    id: createId("reset"),
    userId: user.id,
    tokenHash: hashResetToken(rawToken),
    createdAt: createdAt.toISOString(),
    expiresAt,
    usedAt: null
  });

  let emailSent = false;

  try {
    emailSent = await sendPasswordResetEmail({
      email: user.email,
      fullName: user.fullName,
      resetUrl
    });
  } catch {
    emailSent = false;
  }

  return {
    requested: true,
    previewUrl: process.env.NODE_ENV === "production" ? null : emailSent ? null : resetUrl,
    emailSent
  };
}

export async function resetPasswordWithToken(token: string, password: string) {
  const tokenRecord = await findPasswordResetTokenByHash(hashResetToken(token));

  if (!tokenRecord || tokenRecord.usedAt) {
    throw new Error("This reset link is invalid or has already been used.");
  }

  if (new Date(tokenRecord.expiresAt).getTime() < Date.now()) {
    await deletePasswordResetTokensByUserId(tokenRecord.userId);
    throw new Error("This reset link has expired. Please request a new one.");
  }

  const user = await findUserById(tokenRecord.userId);

  if (!user) {
    throw new Error("We could not find the account for this reset link.");
  }

  const { hash, salt } = hashPassword(password);

  await updateUserPassword({
    userId: user.id,
    passwordHash: hash,
    passwordSalt: salt
  });
  await deletePasswordResetTokensByUserId(user.id);

  return user;
}

export async function createSession(userId: string) {
  const token = createId("session");
  const now = new Date();
  const session: SessionRecord = {
    token,
    userId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + sessionDurationMs).toISOString()
  };

  await replaceSessionForUser(session);

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, encodeSessionToken(token), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(session.expiresAt)
  });

  return session;
}

export async function savePendingSocialProfile(profile: PendingSocialProfile) {
  const cookieStore = await cookies();
  const expiresAt = new Date(Date.now() + socialProfileDurationMs);

  cookieStore.set(socialProfileCookieName, encodePendingSocialProfile(profile), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
}

export async function getPendingSocialProfile() {
  const cookieStore = await cookies();
  return decodePendingSocialProfile(cookieStore.get(socialProfileCookieName)?.value);
}

export async function clearPendingSocialProfile() {
  const cookieStore = await cookies();
  cookieStore.delete(socialProfileCookieName);
}

export async function clearSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(sessionCookieName)?.value;
  const token = decodeSessionToken(raw);

  if (token) {
    await deleteSessionByToken(token);
  }

  cookieStore.delete(sessionCookieName);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(sessionCookieName)?.value;
  const token = decodeSessionToken(raw);

  if (!token) {
    return null;
  }

  const session = await findSessionByToken(token);

  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await clearSession();
    return null;
  }

  return findUserById(session.userId);
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  return user;
}
