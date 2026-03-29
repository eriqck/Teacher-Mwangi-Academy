import { NextRequest, NextResponse } from "next/server";
import { createSession, resetPasswordWithOtp } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      otp?: string;
      password?: string;
    };

    if (!body.email || !body.otp || !body.password) {
      return NextResponse.json(
        { error: "Email address, reset code, and new password are required." },
        { status: 400 }
      );
    }

    if (body.password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const user = await resetPasswordWithOtp(body.email, body.otp, body.password);
    await createSession(user.id);

    return NextResponse.json({
      ok: true,
      message: "Your password has been reset successfully."
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to reset password."
      },
      { status: 400 }
    );
  }
}
