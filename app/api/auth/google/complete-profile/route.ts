import { NextRequest, NextResponse } from "next/server";
import {
  clearPendingSocialProfile,
  createSession,
  createSocialUser,
  getPendingSocialProfile
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const pendingProfile = await getPendingSocialProfile();

    if (!pendingProfile) {
      return NextResponse.json(
        { error: "Your Google sign-in session expired. Please try again." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as {
      role?: "parent" | "teacher";
      phoneNumber?: string;
    };

    if (!body.role || !body.phoneNumber) {
      return NextResponse.json(
        { error: "Account type and phone number are required." },
        { status: 400 }
      );
    }

    if (body.role !== "parent" && body.role !== "teacher") {
      return NextResponse.json({ error: "Invalid account type." }, { status: 400 });
    }

    const user = await createSocialUser({
      fullName: pendingProfile.fullName,
      email: pendingProfile.email,
      phoneNumber: body.phoneNumber,
      role: body.role
    });

    await clearPendingSocialProfile();
    await createSession(user.id);

    return NextResponse.json({
      ok: true,
      message: "Your Google account is ready."
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to complete Google sign-in."
      },
      { status: 400 }
    );
  }
}
