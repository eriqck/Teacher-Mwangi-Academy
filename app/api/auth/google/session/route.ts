import { NextRequest, NextResponse } from "next/server";
import {
  clearPendingSocialProfile,
  createSession,
  savePendingSocialProfile
} from "@/lib/auth";
import { findUserByEmail } from "@/lib/repository";
import { getSupabasePublicServerClient, isSupabasePublicConfigured } from "@/lib/supabase-public";

function getFullName(input: Record<string, unknown>) {
  const candidates = [
    input.full_name,
    input.name,
    input.given_name,
    input.email
  ];

  return `${candidates.find((value) => typeof value === "string" && value.trim()) ?? "Google User"}`.trim();
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabasePublicConfigured()) {
      return NextResponse.json(
        { error: "Google sign-in is not configured yet." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as {
      accessToken?: string;
    };

    if (!body.accessToken) {
      return NextResponse.json({ error: "Missing Google access token." }, { status: 400 });
    }

    const supabase = getSupabasePublicServerClient();
    const { data, error } = await supabase.auth.getUser(body.accessToken);

    if (error || !data.user?.email) {
      return NextResponse.json({ error: "Unable to verify Google sign-in." }, { status: 401 });
    }

    if (data.user.app_metadata?.provider !== "google") {
      return NextResponse.json({ error: "This sign-in is not a Google account." }, { status: 400 });
    }

    const email = data.user.email.trim().toLowerCase();
    const fullName = getFullName((data.user.user_metadata ?? {}) as Record<string, unknown>);
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      await clearPendingSocialProfile();
      await createSession(existingUser.id);

      return NextResponse.json({
        ok: true,
        data: {
          next: "/dashboard"
        }
      });
    }

    await savePendingSocialProfile({
      email,
      fullName,
      provider: "google",
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({
      ok: true,
      data: {
        next: "/complete-profile"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to continue with Google."
      },
      { status: 500 }
    );
  }
}
