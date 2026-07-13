import { NextResponse } from "next/server";

/**
 * Vercel Cron placeholder for weekly digests.
 * Secure with CRON_SECRET. Without per-user stored tokens this returns guidance.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    message:
      "Weekly cron is live. Use the GitHub Action in .github/workflows/weekly-slopsweep.yml for repo scans, and SLACK_WEBHOOK_URL for dashboard notifications.",
    at: new Date().toISOString(),
  });
}
