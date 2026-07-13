import { detectAndClean } from "@/lib/detectors";
import { parseGitHubPrUrl } from "@/lib/github";
import { NextResponse } from "next/server";

/**
 * Public PR inspect — no login required for public PRs.
 * Optional GITHUB_TOKEN raises rate limits.
 */
export async function POST(request: Request) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = body.url ? parseGitHubPrUrl(body.url) : null;
  if (!parsed) {
    return NextResponse.json(
      {
        error:
          "Paste a GitHub pull request URL like https://github.com/owner/repo/pull/123",
      },
      { status: 400 },
    );
  }

  const token = process.env.GITHUB_TOKEN;

  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "SlopSweep/1.0",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/pulls/${parsed.number}`,
      { headers, next: { revalidate: 60 } },
    );

    if (!res.ok) {
      const msg =
        res.status === 404
          ? "PR not found (private PRs need sign-in on the dashboard)"
          : "GitHub API error — try again later";
      return NextResponse.json({ error: msg }, { status: res.status });
    }

    const data = (await res.json()) as {
      body?: string;
      title: string;
      state: string;
      html_url: string;
      number: number;
    };

    const prBody = data.body ?? "";
    const detection = detectAndClean(prBody);

    return NextResponse.json({
      repo: `${parsed.owner}/${parsed.repo}`,
      number: data.number,
      title: data.title,
      state: data.state,
      htmlUrl: data.html_url,
      body: prBody,
      cleaned: detection.cleaned,
      contaminated: detection.contaminated,
      matches: detection.matches.map((m) => ({
        kind: m.kind,
        label: m.label,
        excerpt: m.excerpt,
      })),
      removedChars: detection.removedChars,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch pull request" },
      { status: 500 },
    );
  }
}
