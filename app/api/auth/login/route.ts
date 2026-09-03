import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { authenticateUser, createId, createSession, hashPassword } from "@/lib/auth";
import { verifyFirebasePasswordSignIn } from "@/lib/firebase-auth";
import { findUserByEmail, findUserById, insertUser } from "@/lib/repository";
import type { UserRecord } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    if (!body.email || !body.password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    let user = null;

    try {
      user = await authenticateUser(body.email, body.password);
    } catch {
      user = null;
    }

    if (!user) {
      const firebaseUser = await verifyFirebasePasswordSignIn(body.email, body.password);

      if (firebaseUser) {
        user =
          (firebaseUser.firebaseUid ? await findUserById(firebaseUser.firebaseUid).catch(() => null) : null) ??
          (firebaseUser.legacyUserId ? await findUserById(firebaseUser.legacyUserId).catch(() => null) : null) ??
          (await findUserByEmail(firebaseUser.email).catch(() => null));

        if (!user) {
          const { hash, salt } = hashPassword(crypto.randomBytes(32).toString("hex"));
          const newUser: UserRecord = {
            id: firebaseUser.legacyUserId || firebaseUser.firebaseUid || createId("user"),
            fullName: firebaseUser.displayName?.trim() || firebaseUser.email,
            email: firebaseUser.email,
            phoneNumber: firebaseUser.phoneNumber?.trim() || "",
            role: "parent",
            passwordHash: hash,
            passwordSalt: salt,
            createdAt: new Date().toISOString()
          };

          try {
            user = await insertUser(newUser);
          } catch {
            return NextResponse.json(
              {
                error: "Your password is correct, but your website profile could not be created right now."
              },
              { status: 409 }
            );
          }
        }
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await createSession(user.id);

    return NextResponse.json({
      ok: true,
      message: "Signed in successfully."
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to sign in right now."
      },
      { status: 500 }
    );
  }
}
