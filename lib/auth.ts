import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionRecord, UserRecord, UserRole } from "@/lib/store";
import {
  deleteSessionByToken,
  findSessionByToken,
  findUserByEmail,
  findUserById,
  insertUser,
  replaceSessionForUser
} from "@/lib/repository";

const sessionCookieName = "teacher_mwangi_session";
const sessionDurationMs = 1000 * 60 * 60 * 24 * 30;

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

function signValue(value: string) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
}

function encodeSessionToken(token: string) {
  return `${token}.${signValue(token)}`;
}

function decodeSessionToken(raw: string | undefined) {
  if (!raw) {
    return null;
  }

  const [token, signature] = raw.split(".");

  if (!token || !signature) {
    return null;
  }

  if (signValue(token) !== signature) {
    return null;
  }

  return token;
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
