import { NextRequest, NextResponse } from "next/server";
import { sendMentorshipRegistrationConfirmation } from "@/lib/email";
import { createId } from "@/lib/auth";
import { saveMentorshipRegistrationRecord } from "@/lib/repository";
import type { MentorshipRegistrationRecord } from "@/lib/store";

const defaultSessionTitle = "Parent Mentorship Session";
const defaultSessionDate = "Saturday at 8:00 PM";

function normalize(value: unknown) {
  return `${value ?? ""}`.trim();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      fullName?: string;
      email?: string;
      phoneNumber?: string;
      childClass?: string;
    };
    const fullName = normalize(body.fullName);
    const email = normalize(body.email).toLowerCase();
    const phoneNumber = normalize(body.phoneNumber);
    const childClass = normalize(body.childClass);
    const sessionTitle = process.env.MENTORSHIP_SESSION_TITLE?.trim() || defaultSessionTitle;
    const sessionDate = process.env.MENTORSHIP_SESSION_DATE?.trim() || defaultSessionDate;
    const meetLink = process.env.MENTORSHIP_MEET_LINK?.trim() || "";

    if (!fullName || !email || !phoneNumber) {
      return NextResponse.json(
        { ok: false, error: "Full name, email address, and phone number are required." },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const registration: MentorshipRegistrationRecord = {
      id: createId("mentor"),
      fullName,
      email,
      phoneNumber,
      childClass,
      sessionTitle,
      sessionDate,
      meetLink,
      confirmationSent: false,
      createdAt: now,
      updatedAt: now
    };

    const confirmationSent = await sendMentorshipRegistrationConfirmation({
      email,
      fullName,
      sessionTitle,
      sessionDate,
      meetLink
    });

    await saveMentorshipRegistrationRecord({
      ...registration,
      confirmationSent
    });

    return NextResponse.json({
      ok: true,
      message: confirmationSent
        ? "Registration received. We have sent a confirmation email."
        : "Registration received. We will share session details before the meeting.",
      registration: {
        sessionTitle,
        sessionDate,
        confirmationSent
      }
    });
  } catch (error) {
    console.error("Mentorship registration failed:", error);
    return NextResponse.json(
      { ok: false, error: "Unable to complete registration right now. Please try again." },
      { status: 500 }
    );
  }
}
