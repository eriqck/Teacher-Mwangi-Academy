import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    email?: string;
  };

  if (!body.email) {
    return NextResponse.json({ error: "Email address is required." }, { status: 400 });
  }

  const result = await requestPasswordReset(body.email);

  return NextResponse.json({
    ok: true,
    message:
      "If an account exists for that email, we have sent password reset instructions.",
    data: {
      previewUrl: result.previewUrl
    }
  });
}
