import { NextRequest, NextResponse } from "next/server";
import { createSession, createUser } from "@/lib/auth";
import type { UserRole } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      fullName?: string;
      email?: string;
      phoneNumber?: string;
      role?: UserRole;
      password?: string;
    };

    if (!body.fullName || !body.email || !body.phoneNumber || !body.role || !body.password) {
      return NextResponse.json({ error: "All signup fields are required." }, { status: 400 });
    }

    if (body.role !== "parent" && body.role !== "teacher") {
      return NextResponse.json({ error: "Invalid account type." }, { status: 400 });
    }

    const user = await createUser({
      fullName: body.fullName,
      email: body.email,
      phoneNumber: body.phoneNumber,
      role: body.role,
      password: body.password
    });

    await createSession(user.id);

    return NextResponse.json({
      ok: true,
      message: "Account created successfully."
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to create account."
      },
      { status: 400 }
    );
  }
}
