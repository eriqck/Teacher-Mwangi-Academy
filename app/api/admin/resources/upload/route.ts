import { NextRequest, NextResponse } from "next/server";
import { isAssessmentSet } from "@/lib/assessment-sets";
import { getCurrentUser } from "@/lib/auth";
import { createSignedResourceUpload, getResourceFilePublicUrl } from "@/lib/repository";
import { saveUploadedResourceMetadata, buildStoragePath } from "@/lib/resources";
import { isSchemeTerm } from "@/lib/scheme-terms";
import type { AssessmentSet, ResourceCategory, ResourceSection, SchemeTerm } from "@/lib/store";

function isCategory(value: string): value is ResourceCategory {
  return value === "revision-material" || value === "scheme-of-work";
}

function isSection(value: string): value is ResourceSection {
  return value === "notes" || value === "assessment" || value === "kjsea-past-papers";
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
    const file = formData.get("file");
    const title = `${formData.get("title") ?? ""}`.trim();
    const description = `${formData.get("description") ?? ""}`.trim();
    const level = `${formData.get("level") ?? ""}`.trim();
    const subject = `${formData.get("subject") ?? ""}`.trim();
    const category = `${formData.get("category") ?? ""}`.trim();
    const section = `${formData.get("section") ?? "notes"}`.trim();
    const assessmentSet = `${formData.get("assessmentSet") ?? ""}`.trim();
    const term = `${formData.get("term") ?? ""}`.trim();
    const examYearValue = `${formData.get("examYear") ?? ""}`.trim();
    const examYear = examYearValue ? Number(examYearValue) : null;
    const audience = `${formData.get("audience") ?? "both"}`.trim();

    if (!(file instanceof File) || file.size === 0 || !title || !description || !level || !subject || !isCategory(category)) {
      return NextResponse.json({ error: "All upload fields are required." }, { status: 400 });
    }

    if (!isSection(section) || (section === "assessment" && !isAssessmentSet(assessmentSet))) {
      return NextResponse.json({ error: "Invalid material section selected." }, { status: 400 });
    }

    if (
      section === "kjsea-past-papers" &&
      (level !== "Grade 9" ||
        examYear === null ||
        !Number.isInteger(examYear) ||
        examYear < 2000 ||
        examYear > 2100)
    ) {
      return NextResponse.json({ error: "Grade 9 KJSEA Past Papers must include a valid exam year." }, { status: 400 });
    }

    if (!isSchemeTerm(term) || !["parent", "teacher", "both"].includes(audience)) {
      return NextResponse.json({ error: "Invalid upload metadata." }, { status: 400 });
    }

    const storagePath = buildStoragePath(category, file.name);
    const signedUpload = await createSignedResourceUpload(storagePath, file.type || "application/octet-stream");
    const storageResponse = await fetch(signedUpload.signedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream"
      },
      body: Buffer.from(await file.arrayBuffer())
    });

    if (!storageResponse.ok) {
      return NextResponse.json({ error: "Cloudflare R2 upload failed." }, { status: 502 });
    }

    const resolvedSection = category === "scheme-of-work" ? "notes" : section;
    const resolvedAssessmentSet: AssessmentSet | null =
      category === "scheme-of-work" || resolvedSection !== "assessment"
        ? null
        : (assessmentSet as AssessmentSet);

    await saveUploadedResourceMetadata({
      title,
      description,
      level,
      subject,
      category,
      section: resolvedSection,
      assessmentSet: resolvedAssessmentSet,
      examYear: resolvedSection === "kjsea-past-papers" ? examYear : null,
      term: term as SchemeTerm,
      audience: audience as "parent" | "teacher" | "both",
      uploadedByUserId: user.id,
      fileName: file.name,
      filePath: storagePath,
      fileUrl: getResourceFilePublicUrl(storagePath),
      mimeType: file.type || "application/octet-stream"
    });

    return NextResponse.json({ ok: true, message: "File uploaded and saved successfully." });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 }
    );
  }
}
