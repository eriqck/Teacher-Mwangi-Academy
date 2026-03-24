import { NextRequest, NextResponse } from "next/server";
import { verifyAndApplyPaystackPayment } from "@/lib/payments";

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference");

  if (!reference) {
    return NextResponse.redirect(new URL("/dashboard?payment=missing-reference", request.url));
  }

  try {
    const result = await verifyAndApplyPaystackPayment(reference);
    const status = result.status === "success" ? "success" : "failed";
    return NextResponse.redirect(new URL(`/dashboard?payment=${status}`, request.url));
  } catch {
    return NextResponse.redirect(new URL("/dashboard?payment=verify-error", request.url));
  }
}
