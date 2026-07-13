import { auth } from "@/auth";
import { getOctokit, getRepoReadme, updateRepoReadme } from "@/lib/github";
import { analyzeReadme } from "@/lib/readme";
import { NextResponse } from "next/server";

/** Create or overwrite README.md with provided content (AI draft commit). */
export async function POST(request: Request) {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { repo?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.repo || typeof body.content !== "string" || !body.content.trim()) {
    return NextResponse.json(
      { error: "repo and content are required" },
      { status: 400 },
    );
  }

  try {
    const octokit = getOctokit(token);
    const existing = await getRepoReadme(octokit, body.repo);
    const path = existing.path ?? "README.md";

    const result = await updateRepoReadme(octokit, body.repo, path, body.content, {
      sha: existing.sha,
      message: existing.sha
        ? "docs: update README via SlopSweep"
        : "docs: add README via SlopSweep",
    });

    const analysis = analyzeReadme(body.content, path);

    return NextResponse.json({
      ok: true,
      path,
      htmlUrl: result.htmlUrl,
      score: analysis.score,
      issues: analysis.issues,
      content: body.content,
      tipContaminated: analysis.tipDetection.contaminated,
      cleaned: analysis.tipDetection.cleaned,
      matches: analysis.tipDetection.matches.map((m) => ({
        kind: m.kind,
        label: m.label,
        excerpt: m.excerpt,
      })),
      removedChars: analysis.tipDetection.removedChars,
      sha: existing.sha,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to commit README" },
      { status: 500 },
    );
  }
}
