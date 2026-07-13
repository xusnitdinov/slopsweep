import { detectAndClean } from "@/lib/detectors";
import { NextResponse } from "next/server";

/** Paste-demo endpoint — no auth required */
export async function POST(request: Request) {
  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = body.text ?? "";
  if (text.length > 100_000) {
    return NextResponse.json({ error: "Text too long" }, { status: 400 });
  }

  const result = detectAndClean(text);
  return NextResponse.json(result);
}
