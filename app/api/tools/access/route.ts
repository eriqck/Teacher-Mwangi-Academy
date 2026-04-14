import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPendingTeacherToolAccessPayment } from "@/lib/payments";
import { getTeacherToolAccess } from "@/lib/teacher-tools";
import { readAppData } from "@/lib/repository";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    if (user.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teacher accounts can unlock the bot workspace." },
        { status: 403 }
      );
    }

    const store = await readAppData();
    const access = getTeacherToolAccess(store, user);

    if (access.hasAccess) {
      return NextResponse.json({ error: "Teacher tools are already unlocked." }, { status: 400 });
    }

    const body = (await request.json()) as {
      accountReference?: string;
    };

    if (!body.accountReference?.trim()) {
      return NextResponse.json({ error: "Enter the account reference to continue." }, { status: 400 });
    }

    const result = await createPendingTeacherToolAccessPayment({
      userId: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      accountReference: body.accountReference.trim()
    });

    return NextResponse.json({
      ok: true,
      message: "Teacher tools checkout started.",
      data: result.result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to start teacher tools checkout."
      },
      { status: 500 }
    );
  }
}
