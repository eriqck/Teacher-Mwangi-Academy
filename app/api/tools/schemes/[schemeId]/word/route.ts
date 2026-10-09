import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Scheme exports are temporarily unavailable." },
    { status: 410 }
  );
}
