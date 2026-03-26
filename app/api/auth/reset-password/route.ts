import { NextRequest, NextResponse } from "next/server";
import { createSession, resetPasswordWithToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      token?: string;
      password?: string;
    };

    if (!body.token || !body.password) {
      return NextResponse.json(
        { error: "Reset token and new password are required." },
        { status: 400 }
      );
    }

    if (body.password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const user = await resetPasswordWithToken(body.token, body.password);
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
