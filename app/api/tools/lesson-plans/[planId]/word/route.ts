import { NextResponse } from "next/server";
import { requireTeacherUser } from "@/lib/auth";
import { levels } from "@/lib/catalog";
import { buildGeneratedLessonPlanWordHtml, getSafeWordFilename } from "@/lib/generated-word-export";
import { readAppData } from "@/lib/repository";

function getLevelTitle(levelId: string) {
  return levels.find((level) => level.id === levelId)?.title ?? levelId;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await context.params;
    const user = await requireTeacherUser();
    const store = await readAppData();
    const lessonPlan = store.generatedLessonPlans.find((entry) => entry.id === planId);
    const metadata =
      store.generatedLessonPlanRequests.find((request) => request.generatedLessonPlanId === planId)?.payload ?? null;

    if (!lessonPlan) {
      return NextResponse.json({ error: "Lesson plan not found." }, { status: 404 });
    }

    if (lessonPlan.userId !== user.id && user.role !== "admin") {
      return NextResponse.json({ error: "You cannot access this lesson plan." }, { status: 403 });
    }

    const levelTitle = getLevelTitle(lessonPlan.level);
    const html = buildGeneratedLessonPlanWordHtml({
      lessonPlan,
      metadata,
      userName: user.fullName,
      levelTitle,
      createdAt: lessonPlan.createdAt
    });
    const fileName = `${getSafeWordFilename(lessonPlan.title, "generated-lesson-plan")}.doc`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "application/msword; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to export lesson plan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
