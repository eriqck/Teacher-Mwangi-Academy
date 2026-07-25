import { NextRequest, NextResponse } from "next/server";
import { createSession, createUser } from "@/lib/auth";
import { subscriptionPlans } from "@/lib/business";
import { createPendingSubscriptionPayment } from "@/lib/payments";
import type { SubscriptionPlan, UserRole } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      fullName?: string;
      email?: string;
      phoneNumber?: string;
      role?: UserRole;
      password?: string;
      plan?: SubscriptionPlan;
      accountReference?: string;
      level?: string;
    };

    if (
      !body.fullName ||
      !body.email ||
      !body.phoneNumber ||
      !body.role ||
      !body.password ||
      !body.plan ||
      !body.accountReference
    ) {
      return NextResponse.json(
        { error: "Please fill in every field, including your subscription plan." },
        { status: 400 }
      );
    }

    if (body.role !== "parent" && body.role !== "teacher") {
      return NextResponse.json({ error: "Invalid account type." }, { status: 400 });
    }

    const selectedPlan = subscriptionPlans[body.plan];

    if (!selectedPlan) {
      return NextResponse.json({ error: "Invalid subscription plan." }, { status: 400 });
    }

    if (selectedPlan.role !== body.role) {
      return NextResponse.json(
        { error: `This plan is only available to ${selectedPlan.role} accounts.` },
        { status: 400 }
      );
    }

    const user = await createUser({
      fullName: body.fullName,
      email: body.email,
      phoneNumber: body.phoneNumber,
      role: body.role,
      password: body.password
    });

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
      message: "Account created. Redirecting you to M-Pesa checkout.",
      data: result.result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to create account and start checkout."
      },
      { status: 400 }
    );
  }
}
