import { NextResponse } from "next/server";
import { createId, requireUser } from "@/lib/auth";
import { teacherLessonPlanPrice } from "@/lib/business";
import { levels } from "@/lib/catalog";
import { buildGeneratedLessonPlan } from "@/lib/lesson-plan-generator";
import { createPendingLessonPlanGenerationPayment } from "@/lib/payments";
import { buildSchemeNoteContext } from "@/lib/scheme-note-context";
import { schemeTerms } from "@/lib/scheme-terms";
import {
  listGeneratedLessonPlansForUser,
  listResources,
  saveGeneratedLessonPlanRecord,
  saveGeneratedLessonPlanRequestRecord,
  savePaymentRecord
} from "@/lib/repository";
import type { GeneratedLessonPlanRequestPayload, PaymentRecord, SchemeTerm } from "@/lib/store";

function resolveLessonPlanTerm(value: string): SchemeTerm {
  const normalized = value.trim().toLowerCase();
  const matched = schemeTerms.find(
    (entry) => entry.id === normalized || entry.label.toLowerCase() === normalized
  );

  return matched?.id ?? "term-1";
}

function getLessonPlanGenerationErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to generate lesson plan.";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("generated_lesson_plans") ||
    normalized.includes("generated_lesson_plan_requests") ||
    normalized.includes("payments_kind_check") ||
    normalized.includes("violates check constraint")
  ) {
    return "Lesson-plan generation is not fully enabled in Supabase yet. Run the generated lesson-plan SQL migrations first, then try again.";
  }

  return message;
}

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
    const weekNumber = typeof body.weekNumber === "string" ? body.weekNumber.trim() : "";
    const lessonNumber = typeof body.lessonNumber === "string" ? body.lessonNumber.trim() : "";
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
    const amount = subStrands.length * teacherLessonPlanPrice;
    const payload: GeneratedLessonPlanRequestPayload = {
      level,
      subject,
      unitTitle,
      subStrands,
      selectedCount: subStrands.length,
      weekNumber,
      lessonNumber,
      schoolName,
      roll,
      lessonTime,
      year,
      term,
      lessonDate,
      teacherName,
      tscNumber
    };

    const levelTitle = levels.find((entry) => entry.id === level)?.title ?? level;
    let sourceNoteContext = undefined;

    try {
      const resources = await listResources();
      sourceNoteContext = await buildSchemeNoteContext({
        resources,
        levelTitle,
        subject,
        term: resolveLessonPlanTerm(term)
      });
    } catch {
      sourceNoteContext = undefined;
    }

    let firstGenerationFree = false;

    if (user.role === "teacher") {
      try {
        const generatedLessonPlans = await listGeneratedLessonPlansForUser(user.id);
        firstGenerationFree = generatedLessonPlans.length === 0;
      } catch {
        firstGenerationFree = false;
      }
    }

    const canGenerateWithoutPayment = user.role === "admin" || firstGenerationFree;

    if (canGenerateWithoutPayment) {
      const paymentId = createId("pay");
      const generatedLessonPlan = buildGeneratedLessonPlan({
        id: createId("generated_lesson_plan"),
        userId: user.id,
        createdAt,
        sourceNoteContext,
        ...payload
      });
      const payment: PaymentRecord = {
        id: paymentId,
        userId: user.id,
        kind: "generated-lesson-plan",
        status: "paid",
        provider: "paystack",
        currency: "KES",
        amount: 0,
        phoneNumber: user.phoneNumber,
        accountReference:
          user.role === "admin"
            ? `${subject} admin lesson plan generation`
            : `${subject} first free lesson plan generation`,
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
        resultCode: 0,
        resultDesc: user.role === "admin" ? "Admin generated without payment" : "First lesson plan generated free",
        createdAt,
        updatedAt: createdAt
      };

      await savePaymentRecord(payment);
      await saveGeneratedLessonPlanRecord(generatedLessonPlan);
      await saveGeneratedLessonPlanRequestRecord({
        id: createId("generated_lesson_plan_request"),
        userId: user.id,
        paymentId,
        status: "completed",
        payload,
        generatedLessonPlanId: generatedLessonPlan.id,
        createdAt,
        updatedAt: createdAt
      });

      return NextResponse.json({
        data: {
          authorization_url: `/teacher-tools/lesson-plans/generated/${generatedLessonPlan.id}?payment=success`,
          reference: paymentId,
          adminBypass: user.role === "admin",
          freeGeneration: firstGenerationFree
        }
      });
    }

    const payment = await createPendingLessonPlanGenerationPayment({
      userId: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      accountReference: `${subject} lesson plan generation`,
      title: `${subject} lesson plan generation`,
      amount
    });

    await saveGeneratedLessonPlanRequestRecord({
      id: createId("generated_lesson_plan_request"),
      userId: user.id,
      paymentId: payment.paymentId,
      status: "pending",
      payload,
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
        error: getLessonPlanGenerationErrorMessage(error)
      },
      { status: 500 }
    );
  }
}
