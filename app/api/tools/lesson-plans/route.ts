import { NextResponse } from "next/server";
import { createId, requireUser } from "@/lib/auth";
import { levels } from "@/lib/catalog";
import { createPendingLessonPlanGenerationPayment } from "@/lib/payments";
import { saveGeneratedLessonPlanRequestRecord } from "@/lib/repository";

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    if (user.role !== "teacher" && user.role !== "admin") {
      return NextResponse.json(
        { error: "Only teacher and admin accounts can generate lesson plans." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const level = typeof body.level === "string" ? body.level : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const unitTitle = typeof body.unitTitle === "string" ? body.unitTitle.trim() : "";
    const schoolName = typeof body.schoolName === "string" ? body.schoolName.trim() : "";
    const roll = typeof body.roll === "string" ? body.roll.trim() : "";
    const lessonTime = typeof body.lessonTime === "string" ? body.lessonTime.trim() : "";
    const year = typeof body.year === "string" ? body.year.trim() : "";
    const term = typeof body.term === "string" ? body.term.trim() : "";
    const lessonDate = typeof body.lessonDate === "string" ? body.lessonDate.trim() : "";
    const teacherName = typeof body.teacherName === "string" ? body.teacherName.trim() : "";
    const tscNumber = typeof body.tscNumber === "string" ? body.tscNumber.trim() : "";
    const subStrands = Array.isArray(body.subStrands)
      ? body.subStrands.map((item) => `${item}`.trim()).filter(Boolean)
      : [];

    if (!levels.some((entry) => entry.id === level)) {
      return NextResponse.json({ error: "Choose a valid level." }, { status: 400 });
    }

    if (!subject || !unitTitle || subStrands.length === 0) {
      return NextResponse.json(
        { error: "Choose a subject and at least one strand/substrand." },
        { status: 400 }
      );
    }

    const createdAt = new Date().toISOString();
    const payment = await createPendingLessonPlanGenerationPayment({
      userId: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      accountReference: `${subject} lesson plan generation`,
      title: `${subject} lesson plan generation`
    });

    await saveGeneratedLessonPlanRequestRecord({
      id: createId("generated_lesson_plan_request"),
      userId: user.id,
      paymentId: payment.paymentId,
      status: "pending",
      payload: {
        level,
        subject,
        unitTitle,
        subStrands,
        selectedCount: subStrands.length,
        schoolName,
        roll,
        lessonTime,
        year,
        term,
        lessonDate,
        teacherName,
        tscNumber
      },
      generatedLessonPlanId: null,
      createdAt,
      updatedAt: createdAt
    });

    return NextResponse.json({
      data: payment.result
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to generate lesson plan."
      },
      { status: 500 }
    );
  }
}
