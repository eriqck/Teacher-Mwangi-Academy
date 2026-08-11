import { NextRequest, NextResponse } from "next/server";
import { sendMasterclassInviteEmail } from "@/lib/email";

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
    // TODO: Integrate with Paystack or other payment provider
    // For now, we'll send the invite email after the registration is accepted.
    console.log("Masterclass Registration:", {
      fullName,
      email,
      phone,
      childGrade,
      amount,
      timestamp: new Date().toISOString(),
    });

    await sendMasterclassInviteEmail({
      email,
      fullName,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Registration successful. The meeting link has been sent to your email.",
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
