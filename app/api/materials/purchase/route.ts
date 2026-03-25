import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPendingSchemePayment } from "@/lib/payments";
import { isSchemeTerm } from "@/lib/scheme-terms";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    if (user.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teacher accounts can buy schemes of work." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      accountReference?: string;
      subject?: string;
      level?: string;
      term?: string;
      amount?: number;
    };

    if (!body.accountReference || !body.subject || !body.level || !body.term || !body.amount) {
      return NextResponse.json({ error: "All purchase fields are required." }, { status: 400 });
    }

    if (!isSchemeTerm(body.term)) {
      return NextResponse.json({ error: "Choose Term 1, Term 2, or Term 3 for the scheme purchase." }, { status: 400 });
    }

    const result = await createPendingSchemePayment({
      userId: user.id,
      email: user.email,
      accountReference: body.accountReference,
      subject: body.subject,
      level: body.level,
      term: body.term,
      amount: body.amount
    });

    return NextResponse.json({
      ok: true,
      message: "Scheme purchase checkout started.",
      data: result.result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to create scheme purchase."
      },
      { status: 500 }
    );
  }
}
