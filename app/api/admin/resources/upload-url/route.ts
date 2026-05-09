import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getManagedStorageMode, isManagedStorageConfigured } from "@/lib/managed-storage";
import { createSignedResourceUpload, getResourceFilePublicUrl } from "@/lib/repository";
import { buildStoragePath } from "@/lib/resources";
import type { ResourceCategory } from "@/lib/store";

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

    if (!isManagedStorageConfigured()) {
      return NextResponse.json({ error: "Direct uploads are not configured in this environment." }, { status: 400 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const category = `${body.category ?? ""}`.trim();
    const fileName = `${body.fileName ?? ""}`.trim();
    const mimeType = `${body.mimeType ?? ""}`.trim() || undefined;

    if (!fileName || !isCategory(category)) {
      return NextResponse.json({ error: "Upload file details are incomplete." }, { status: 400 });
    }

    const storagePath = buildStoragePath(category, fileName);
    const signedUpload = await createSignedResourceUpload(storagePath, mimeType);

    return NextResponse.json({
      ok: true,
      storageProvider: getManagedStorageMode(),
      signedUrl: signedUpload.signedUrl,
      storagePath,
      fileUrl: getResourceFilePublicUrl(storagePath)
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not prepare upload."
      },
      { status: 500 }
    );
  }
}
