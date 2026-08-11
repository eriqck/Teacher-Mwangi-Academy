import { NextRequest, NextResponse } from "next/server";
import { createId } from "@/lib/auth";
import { getPaystackCallbackUrl, initializePaystackTransaction } from "@/lib/paystack";
import { savePaymentRecord } from "@/lib/repository";
import type { PaymentRecord } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, email, phone, childGrade, amount } = body;

    if (!fullName || !email || !phone || !childGrade || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const paymentId = createId("pay");
    const createdAt = new Date().toISOString();

    const payment: PaymentRecord = {
      id: paymentId,
      userId: "",
      kind: "masterclass",
      status: "pending",
      provider: "paystack",
      currency: "KES",
      amount,
      phoneNumber: phone,
      accountReference: `Masterclass registration for ${fullName}`,
      plan: null,
      schemeSubject: null,
      schemeLevel: null,
      schemeTerm: null,
      resourceId: null,
      paymentReference: paymentId,
      authorizationUrl: null,
      checkoutRequestId: null,
      merchantRequestId: null,
      mpesaReceiptNumber: null,
      resultCode: null,
      resultDesc: null,
      createdAt,
      updatedAt: createdAt
    };

    await savePaymentRecord(payment);

    const result = await initializePaystackTransaction({
      email,
      amount,
      reference: paymentId,
      callbackUrl: getPaystackCallbackUrl(),
      metadata: {
        kind: "masterclass",
        fullName,
        childGrade,
        phone
      }
    });

    return NextResponse.json(
      {
        success: true,
        paymentUrl: result.authorization_url,
        reference: result.reference
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Masterclass registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
