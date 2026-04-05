import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { subscriptionPlans } from "@/lib/business";
import { adminAssignMembership } from "@/lib/payments";
import type { SubscriptionPlan } from "@/lib/store";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin();
    const body = (await request.json()) as {
      plan?: SubscriptionPlan;
    };
    const { userId } = await context.params;

    if (!body.plan || !(body.plan in subscriptionPlans)) {
      return NextResponse.json(
        { ok: false, error: "Choose a valid membership plan." },
        { status: 400 }
      );
    }

    const result = await adminAssignMembership({
      userId,
      plan: body.plan
    });

    return NextResponse.json({
      ok: true,
      message: "Membership updated successfully.",
      user: result.user
        ? {
            id: result.user.id,
            role: result.user.role
          }
        : null,
      subscription: {
        id: result.subscription.id,
        plan: result.subscription.plan,
        status: result.subscription.status,
        amount: result.subscription.amount,
        endDateLabel: result.subscription.endDate
          ? result.subscription.endDate.slice(0, 10)
          : "Pending payment"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not update the user membership."
      },
      { status: 400 }
    );
  }
}
