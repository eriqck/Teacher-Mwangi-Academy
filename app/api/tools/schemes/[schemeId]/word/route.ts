import { NextResponse } from "next/server";
import { requireTeacherUser } from "@/lib/auth";
import { levels } from "@/lib/catalog";
import { buildGeneratedSchemeWordHtml, getSafeWordFilename } from "@/lib/generated-word-export";
import { readAppData } from "@/lib/repository";

function getLevelTitle(levelId: string) {
  return levels.find((level) => level.id === levelId)?.title ?? levelId;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ schemeId: string }> }
) {
  try {
    const { schemeId } = await context.params;
    const user = await requireTeacherUser();
    const store = await readAppData();
    const scheme = store.generatedSchemes.find((entry) => entry.id === schemeId);

    if (!scheme) {
      return NextResponse.json({ error: "Scheme not found." }, { status: 404 });
    }

    if (scheme.userId !== user.id && user.role !== "admin") {
      return NextResponse.json({ error: "You cannot access this scheme." }, { status: 403 });
    }

    const levelTitle = getLevelTitle(scheme.level);
    const html = buildGeneratedSchemeWordHtml({
      scheme,
      userName: user.fullName,
      levelTitle
    });
    const fileName = `${getSafeWordFilename(scheme.title, "generated-scheme")}.doc`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "application/msword; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to export scheme.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
