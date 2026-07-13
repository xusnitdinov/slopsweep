import { auth } from "@/auth";
import { getOctokit, getRepoReadme } from "@/lib/github";
import { analyzeReadme } from "@/lib/readme";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { repos?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const repos = body.repos ?? [];
  if (!Array.isArray(repos) || repos.length === 0) {
    return NextResponse.json(
      { error: "Select at least one repository" },
      { status: 400 },
    );
  }
  if (repos.length > 40) {
    return NextResponse.json(
      { error: "Scan at most 40 repos at a time" },
      { status: 400 },
    );
  }

  try {
    const octokit = getOctokit(token);
    const results = [];

    for (const fullName of repos) {
      const file = await getRepoReadme(octokit, fullName);
      const analysis = analyzeReadme(file.content, file.path);
      results.push({
        repo: fullName,
        path: file.path,
        sha: file.sha,
        htmlUrl: file.htmlUrl,
        content: analysis.content,
        cleaned: analysis.tipDetection.cleaned,
        tipContaminated: analysis.tipDetection.contaminated,
        matches: analysis.tipDetection.matches.map((m) => ({
          kind: m.kind,
          label: m.label,
          excerpt: m.excerpt,
        })),
        removedChars: analysis.tipDetection.removedChars,
        issues: analysis.issues,
        score: analysis.score,
      });
    }

    const withIssues = results.filter((r) => r.issues.length > 0).length;
    const withTips = results.filter((r) => r.tipContaminated).length;

    return NextResponse.json({
      results,
      scanned: repos.length,
      withIssues,
      withTips,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "README scan failed" }, { status: 500 });
  }
}
