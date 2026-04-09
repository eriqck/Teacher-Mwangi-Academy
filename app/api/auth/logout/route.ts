import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";
import { getSiteUrl } from "@/lib/site-url";

export async function POST() {
  await clearSession();
  return NextResponse.redirect(new URL("/login", getSiteUrl()));
}
