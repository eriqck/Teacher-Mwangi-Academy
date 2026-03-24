import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { saveUploadedResource } from "@/lib/resources";
import type { ResourceCategory } from "@/lib/store";

function isAudience(value: string): value is "parent" | "teacher" | "both" {
  return value === "parent" || value === "teacher" || value === "both";
}

function isCategory(value: string): value is ResourceCategory {
  return value === "revision-material" || value === "scheme-of-work";
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
    const audience = `${formData.get("audience") ?? "both"}`.trim();
    const file = formData.get("file");

    if (!title || !description || !level || !subject || !isCategory(category)) {
      return NextResponse.json({ error: "All upload fields are required." }, { status: 400 });
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Please choose a file to upload." }, { status: 400 });
    }

    if (!isAudience(audience)) {
      return NextResponse.json({ error: "Invalid audience selected." }, { status: 400 });
    }

    await saveUploadedResource({
      title,
      description,
      level,
      subject,
      category,
      audience,
      uploadedByUserId: user.id,
      file
    });

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
