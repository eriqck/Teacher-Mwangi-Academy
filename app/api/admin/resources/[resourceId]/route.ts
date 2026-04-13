import { NextRequest, NextResponse } from "next/server";
import { isAssessmentSet } from "@/lib/assessment-sets";
import { getCurrentUser } from "@/lib/auth";
import { deleteResourceFile, deleteResourceRecord, readAppData, updateResourceRecord } from "@/lib/repository";
import { isSchemeTerm } from "@/lib/scheme-terms";
import type { AssessmentSet, ResourceCategory, ResourceSection, SchemeTerm } from "@/lib/store";

function isAudience(value: string): value is "parent" | "teacher" | "both" {
  return value === "parent" || value === "teacher" || value === "both";
}

function isCategory(value: string): value is ResourceCategory {
  return value === "revision-material" || value === "scheme-of-work";
}

function isSection(value: string): value is ResourceSection {
  return value === "notes" || value === "assessment";
}

async function requireAdminUser() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Please sign in first." }, { status: 401 })
    };
  }

  if (user.role !== "admin") {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Only admin accounts can manage uploads." }, { status: 403 })
    };
  }

  return { ok: true as const, user };
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ resourceId: string }> }
) {
  try {
    const adminCheck = await requireAdminUser();
    if (!adminCheck.ok) {
      return adminCheck.response;
    }

    const { resourceId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;

    const title = `${body.title ?? ""}`.trim();
    const description = `${body.description ?? ""}`.trim();
    const level = `${body.level ?? ""}`.trim();
    const subject = `${body.subject ?? ""}`.trim();
    const audience = `${body.audience ?? ""}`.trim();
    const section = `${body.section ?? ""}`.trim();
    const assessmentSet = body.assessmentSet === null ? null : `${body.assessmentSet ?? ""}`.trim();
    const term = body.term === null ? null : `${body.term ?? ""}`.trim();

    const store = await readAppData();
    const resource = store.resources.find((entry) => entry.id === resourceId);

    if (!resource) {
      return NextResponse.json({ error: "Material not found." }, { status: 404 });
    }

    if (!title || !description || !level || !subject) {
      return NextResponse.json({ error: "All material fields are required." }, { status: 400 });
    }

    if (!isCategory(resource.category)) {
      return NextResponse.json({ error: "Material category is invalid." }, { status: 400 });
    }

    if (resource.category === "scheme-of-work") {
      if (!term || !isSchemeTerm(term)) {
        return NextResponse.json({ error: "Schemes of work must include Term 1, Term 2, or Term 3." }, { status: 400 });
      }

      const updated = await updateResourceRecord(resourceId, {
        title,
        description,
        level,
        subject,
        audience: "teacher",
        section: "notes",
        assessmentSet: null,
        term: term as SchemeTerm,
        updatedAt: new Date().toISOString()
      });

      return NextResponse.json({
        ok: true,
        message: "Scheme updated successfully.",
        resource: updated
      });
    }

    if (!isAudience(audience)) {
      return NextResponse.json({ error: "Invalid audience selected." }, { status: 400 });
    }

    if (!isSection(section)) {
      return NextResponse.json({ error: "Invalid material section selected." }, { status: 400 });
    }

    if (section === "assessment" && (!assessmentSet || !isAssessmentSet(assessmentSet))) {
      return NextResponse.json({ error: "Assessment materials must include Set 1, Set 2, Set 3, or CEKENA Exams." }, { status: 400 });
    }

    const resolvedAssessmentSet: AssessmentSet | null = section === "assessment" ? (assessmentSet as AssessmentSet) : null;

    const updated = await updateResourceRecord(resourceId, {
      title,
      description,
      level,
      subject,
      audience,
      section,
      assessmentSet: resolvedAssessmentSet,
      term: null,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({
      ok: true,
      message: "Material updated successfully.",
      resource: updated
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Update failed."
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ resourceId: string }> }
) {
  try {
    const adminCheck = await requireAdminUser();
    if (!adminCheck.ok) {
      return adminCheck.response;
    }

    const { resourceId } = await context.params;
    const store = await readAppData();
    const resource = store.resources.find((entry) => entry.id === resourceId);

    if (!resource) {
      return NextResponse.json({ error: "Material not found." }, { status: 404 });
    }

    await deleteResourceFile(resource.filePath);
    await deleteResourceRecord(resourceId);

    return NextResponse.json({
      ok: true,
      message: "Material deleted successfully."
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Delete failed."
      },
      { status: 500 }
    );
  }
}
