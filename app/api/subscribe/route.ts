import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { subscriptionPlans } from "@/lib/business";
import { createPendingSubscriptionPayment } from "@/lib/payments";
import type { SubscriptionPlan } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const body = (await request.json()) as {
      plan: SubscriptionPlan;
      accountReference: string;
      level?: string;
    };

    if (!body.plan || !body.accountReference) {
      return NextResponse.json(
        { error: "Plan and account reference are required." },
        { status: 400 }
      );
    }

    const selectedPlan = subscriptionPlans[body.plan];

    if (!selectedPlan) {
      return NextResponse.json({ error: "Invalid subscription plan." }, { status: 400 });
    }

    if (selectedPlan.role !== user.role) {
      return NextResponse.json(
        { error: `This plan is only available to ${selectedPlan.role} accounts.` },
        { status: 403 }
      );
    }

    const result = await createPendingSubscriptionPayment({
      userId: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      plan: body.plan,
      accountReference: body.accountReference,
      level: body.level ?? null
    });

    return NextResponse.json({
      ok: true,
      message: "Subscription checkout started.",
      data: result.result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown subscription error."
      },
      { status: 500 }
    );
  }
}
