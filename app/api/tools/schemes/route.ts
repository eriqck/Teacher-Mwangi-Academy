import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Scheme generation is temporarily unavailable." },
    { status: 410 }
  );
}
