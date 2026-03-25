import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteResourceFile, getResourceFilePublicUrl } from "@/lib/repository";
import { saveUploadedResource, saveUploadedResourceMetadata } from "@/lib/resources";
import type { AssessmentSet, ResourceCategory, ResourceSection } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase";

function isAudience(value: string): value is "parent" | "teacher" | "both" {
  return value === "parent" || value === "teacher" || value === "both";
}

function isCategory(value: string): value is ResourceCategory {
  return value === "revision-material" || value === "scheme-of-work";
}

function isSection(value: string): value is ResourceSection {
  return value === "notes" || value === "assessment";
}

function isAssessmentSet(value: string): value is AssessmentSet {
  return value === "set-1" || value === "set-2" || value === "set-3";
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Only admin accounts can access uploads." }, { status: 403 });
    }

    const formData = await request.formData();
    const title = `${formData.get("title") ?? ""}`.trim();
    const description = `${formData.get("description") ?? ""}`.trim();
    const level = `${formData.get("level") ?? ""}`.trim();
    const subject = `${formData.get("subject") ?? ""}`.trim();
    const category = `${formData.get("category") ?? ""}`.trim();
    const section = `${formData.get("section") ?? "notes"}`.trim();
    const assessmentSet = `${formData.get("assessmentSet") ?? ""}`.trim();
    const audience = `${formData.get("audience") ?? "both"}`.trim();
    const storagePath = `${formData.get("storagePath") ?? ""}`.trim();
    const fileName = `${formData.get("fileName") ?? ""}`.trim();
    const mimeType = `${formData.get("mimeType") ?? ""}`.trim();
    const file = formData.get("file");

    if (!title || !description || !level || !subject || !isCategory(category)) {
      return NextResponse.json({ error: "All upload fields are required." }, { status: 400 });
    }

    const isDirectSupabaseUpload = Boolean(storagePath);

    if (!isDirectSupabaseUpload && (!(file instanceof File) || file.size === 0)) {
      return NextResponse.json({ error: "Please choose a file to upload." }, { status: 400 });
    }

    const uploadedFile = file instanceof File ? file : null;

    if (isDirectSupabaseUpload && (!fileName || !mimeType || !isSupabaseConfigured())) {
      return NextResponse.json({ error: "Direct upload metadata is incomplete." }, { status: 400 });
    }

    if (!isAudience(audience)) {
      return NextResponse.json({ error: "Invalid audience selected." }, { status: 400 });
    }

    if (category === "revision-material" && !isSection(section)) {
      return NextResponse.json({ error: "Invalid material section selected." }, { status: 400 });
    }

    if (category === "revision-material" && section === "assessment" && !isAssessmentSet(assessmentSet)) {
      return NextResponse.json({ error: "Assessment materials must include Set 1, Set 2, or Set 3." }, { status: 400 });
    }

    const resolvedSection: ResourceSection =
      category === "scheme-of-work" ? "notes" : (section as ResourceSection);
    const resolvedAssessmentSet: AssessmentSet | null =
      category === "scheme-of-work"
        ? null
        : resolvedSection === "assessment"
          ? (assessmentSet as AssessmentSet)
          : null;

    try {
      if (isDirectSupabaseUpload) {
        await saveUploadedResourceMetadata({
          title,
          description,
          level,
          subject,
          category,
          section: resolvedSection,
          assessmentSet: resolvedAssessmentSet,
          audience,
          uploadedByUserId: user.id,
          fileName,
          filePath: storagePath,
          fileUrl: getResourceFilePublicUrl(storagePath),
          mimeType
        });
      } else {
        await saveUploadedResource({
          title,
          description,
          level,
          subject,
          category,
          section: resolvedSection,
          assessmentSet: resolvedAssessmentSet,
          audience,
          uploadedByUserId: user.id,
          file: uploadedFile as File
        });
      }
    } catch (error) {
      if (isDirectSupabaseUpload) {
        await deleteResourceFile(storagePath).catch(() => undefined);
      }
      throw error;
    }

    return NextResponse.json({
      ok: true,
      message: "File uploaded and saved successfully."
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Upload failed."
      },
      { status: 500 }
    );
  }
}
