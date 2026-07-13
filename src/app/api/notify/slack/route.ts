import { auth } from "@/auth";
import { NextResponse } from "next/server";

/** Optional Slack notify when a scan finishes (user-triggered). */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      message: "SLACK_WEBHOOK_URL not configured",
    });
  }

  let body: {
    title?: string;
    text?: string;
    hits?: number;
    repos?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text:
          body.text ||
          `*${body.title ?? "SlopSweep"}*\nHits: ${body.hits ?? 0} · Repos: ${body.repos ?? 0}`,
      }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Slack webhook failed" }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Slack notify failed" }, { status: 500 });
  }
}
