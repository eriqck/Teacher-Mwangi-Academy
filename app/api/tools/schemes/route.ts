import { NextResponse } from "next/server";
import { requireUser, createId } from "@/lib/auth";
import { levels } from "@/lib/catalog";
import { readAppData, saveGeneratedSchemeRecord } from "@/lib/repository";
import { buildGeneratedScheme, normalizeLineList } from "@/lib/scheme-generator";
import { getTeacherToolAccess } from "@/lib/teacher-tools";

function isSchemeTerm(value: string): value is "term-1" | "term-2" | "term-3" {
  return value === "term-1" || value === "term-2" || value === "term-3";
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    if (user.role !== "teacher" && user.role !== "admin") {
      return NextResponse.json(
        { error: "Only teacher and admin accounts can generate schemes." },
        { status: 403 }
      );
    }

    const store = await readAppData();
    const access = getTeacherToolAccess(store, user);

    if (!access.hasAccess && user.role !== "admin") {
      return NextResponse.json(
        { error: "Unlock the teacher bot workspace first before generating schemes." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const level = typeof body.level === "string" ? body.level : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const term = typeof body.term === "string" ? body.term : "";
    const strand = typeof body.strand === "string" ? body.strand.trim() : "";
    const subStrand = typeof body.subStrand === "string" ? body.subStrand.trim() : "";
    const schoolName = typeof body.schoolName === "string" ? body.schoolName.trim() : "";
    const className = typeof body.className === "string" ? body.className.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    const weeksCount = Number(body.weeksCount);
    const lessonsPerWeek = Number(body.lessonsPerWeek);

    if (!levels.some((entry) => entry.id === level)) {
      return NextResponse.json({ error: "Choose a valid level." }, { status: 400 });
    }

    if (!subject || !strand || !subStrand) {
      return NextResponse.json(
        { error: "Level, subject, strand, and sub-strand are required." },
        { status: 400 }
      );
    }

    if (!isSchemeTerm(term)) {
      return NextResponse.json({ error: "Choose a valid school term." }, { status: 400 });
    }

    if (!Number.isFinite(weeksCount) || weeksCount < 1 || weeksCount > 20) {
      return NextResponse.json(
        { error: "Weeks in term must be between 1 and 20." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(lessonsPerWeek) || lessonsPerWeek < 1 || lessonsPerWeek > 10) {
      return NextResponse.json(
        { error: "Lessons per week must be between 1 and 10." },
        { status: 400 }
      );
    }

    const learningOutcomes = normalizeLineList(typeof body.learningOutcomes === "string" ? body.learningOutcomes : "");

    if (learningOutcomes.length === 0) {
      return NextResponse.json(
        { error: "Add at least one learning outcome." },
        { status: 400 }
      );
    }

    const createdAt = new Date().toISOString();
    const scheme = buildGeneratedScheme({
      id: createId("generated_scheme"),
      userId: user.id,
      createdAt,
      level,
      subject,
      term,
      schoolName,
      className,
      strand,
      subStrand,
      weeksCount,
      lessonsPerWeek,
      learningOutcomes,
      keyInquiryQuestions: normalizeLineList(typeof body.keyInquiryQuestions === "string" ? body.keyInquiryQuestions : ""),
      coreCompetencies: normalizeLineList(typeof body.coreCompetencies === "string" ? body.coreCompetencies : ""),
      values: normalizeLineList(typeof body.values === "string" ? body.values : ""),
      pertinentIssues: normalizeLineList(typeof body.pertinentIssues === "string" ? body.pertinentIssues : ""),
      resources: normalizeLineList(typeof body.resources === "string" ? body.resources : ""),
      assessmentMethods: normalizeLineList(typeof body.assessmentMethods === "string" ? body.assessmentMethods : ""),
      notes
    });

    await saveGeneratedSchemeRecord(scheme);

    return NextResponse.json({
      schemeId: scheme.id
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to generate scheme."
      },
      { status: 500 }
    );
  }
}
