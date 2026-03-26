import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPendingResourcePayment, createPendingSchemePayment } from "@/lib/payments";
import { readAppData } from "@/lib/repository";
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
      kind?: string;
      accountReference?: string;
      resourceId?: string;
      subject?: string;
      level?: string;
      term?: string;
      amount?: number;
    };

    if (!body.accountReference || !body.kind) {
      return NextResponse.json({ error: "All purchase fields are required." }, { status: 400 });
    }

    if (body.kind !== "scheme" && body.kind !== "resource") {
      return NextResponse.json({ error: "Invalid purchase type selected." }, { status: 400 });
    }

    if (body.kind === "resource") {
      if (!body.resourceId) {
        return NextResponse.json({ error: "Choose the note or assessment you want to buy." }, { status: 400 });
      }

      const store = await readAppData();
      const resource = store.resources.find((entry) => entry.id === body.resourceId);

      if (!resource || resource.category !== "revision-material") {
        return NextResponse.json({ error: "Material not found." }, { status: 404 });
      }

      if (resource.audience === "parent") {
        return NextResponse.json({ error: "This material is not available for teacher one-time purchase." }, { status: 403 });
      }

      const alreadyPurchased = store.resourcePurchases.some(
        (purchase) =>
          purchase.userId === user.id &&
          purchase.resourceId === resource.id &&
          purchase.status === "paid"
      );

      if (alreadyPurchased) {
        return NextResponse.json({ error: "You already own this material." }, { status: 400 });
      }

      const result = await createPendingResourcePayment({
        userId: user.id,
        email: user.email,
        accountReference: body.accountReference,
        resource
      });

      return NextResponse.json({
        ok: true,
        message: "Material purchase checkout started.",
        data: result.result
      });
    }

    if (!body.subject || !body.level || !body.term || !body.amount) {
      return NextResponse.json({ error: "All scheme purchase fields are required." }, { status: 400 });
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
