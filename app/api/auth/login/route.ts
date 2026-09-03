import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, createSession } from "@/lib/auth";
import { verifyFirebasePasswordSignIn } from "@/lib/firebase-auth";
import { findUserByEmail, findUserById } from "@/lib/repository";

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
          (await findUserByEmail(firebaseUser.email).catch(() => null));

        if (!user) {
          return NextResponse.json(
            {
              error:
                "Your Firebase password is correct, but this account has not been connected to the website profile yet."
            },
            { status: 409 }
          );
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
