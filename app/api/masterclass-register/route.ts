import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, email, phone, childGrade, amount } = body;

    // Validate required fields
    if (!fullName || !email || !phone || !childGrade || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // TODO: Store registration in database
    // For now, we'll just log it and return success
    console.log("Masterclass Registration:", {
      fullName,
      email,
      phone,
      childGrade,
      amount,
      timestamp: new Date().toISOString(),
    });

    // TODO: Integrate with Paystack or other payment provider
    // For now, return a simple success response
    // In production, you would:
    // 1. Create a payment record in the database
    // 2. Initialize a Paystack payment
    // 3. Return the payment URL

    return NextResponse.json(
      {
        success: true,
        message: "Registration successful",
        // In production, include payment URL:
        // paymentUrl: "https://checkout.paystack.com/...",
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
