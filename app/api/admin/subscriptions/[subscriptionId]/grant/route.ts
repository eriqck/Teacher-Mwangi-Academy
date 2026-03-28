import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { manuallyGrantSubscriptionAccess } from "@/lib/payments";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    await requireAdmin();
    const { subscriptionId } = await context.params;
    const subscription = await manuallyGrantSubscriptionAccess(subscriptionId);

    return NextResponse.json({
      ok: true,
      message: "Subscriber access granted manually.",
      subscription: {
        id: subscription.id,
        status: subscription.status,
        endDateLabel: subscription.endDate ? subscription.endDate.slice(0, 10) : "Pending payment"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not grant subscriber access."
      },
      { status: 400 }
    );
  }
}
