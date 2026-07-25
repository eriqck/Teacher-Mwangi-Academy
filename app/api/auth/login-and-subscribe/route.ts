import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, createSession } from "@/lib/auth";
import { subscriptionPlans } from "@/lib/business";
import { createPendingSubscriptionPayment } from "@/lib/payments";
import type { SubscriptionPlan } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      plan?: SubscriptionPlan;
      accountReference?: string;
      level?: string;
    };

    if (!body.email || !body.password || !body.plan || !body.accountReference) {
      return NextResponse.json(
        { error: "Please fill in your login details and subscription plan." },
        { status: 400 }
      );
    }

    const user = await authenticateUser(body.email, body.password);

    if (!user) {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }

    const selectedPlan = subscriptionPlans[body.plan];

    if (!selectedPlan) {
      return NextResponse.json({ error: "Invalid subscription plan." }, { status: 400 });
    }

    if (selectedPlan.role !== user.role) {
      return NextResponse.json(
        { error: `This plan is only available to ${selectedPlan.role} accounts.` },
        { status: 400 }
      );
    }

    await createSession(user.id);

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
      message: "Signed in. Redirecting you to M-Pesa checkout.",
      data: result.result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to sign in and start checkout."
      },
      { status: 400 }
    );
  }
}
