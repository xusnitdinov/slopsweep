import { auth } from "@/auth";
import { detectAndClean } from "@/lib/detectors";
import { cleanPullRequestBody, getOctokit } from "@/lib/github";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    repo?: string;
    number?: number;
    dryRun?: boolean;
    cleaned?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fullName = body.repo;
  const number = body.number;
  if (!fullName || typeof number !== "number") {
    return NextResponse.json(
      { error: "repo and number are required" },
      { status: 400 },
    );
  }

  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) {
    return NextResponse.json({ error: "Invalid repo" }, { status: 400 });
  }

  try {
    const octokit = getOctokit(token);
    const { data: pr } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: number,
    });

    const detection = detectAndClean(pr.body ?? "");
    if (!detection.contaminated) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        message: "PR body is already clean",
        htmlUrl: pr.html_url,
      });
    }

    const cleaned =
      typeof body.cleaned === "string" && body.cleaned.length > 0
        ? body.cleaned
        : detection.cleaned;

    if (body.dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        before: pr.body ?? "",
        after: cleaned,
        matches: detection.matches,
        htmlUrl: pr.html_url,
      });
    }

    const result = await cleanPullRequestBody(
      octokit,
      owner,
      repo,
      number,
      cleaned,
    );

    return NextResponse.json({
      ok: true,
      cleaned: true,
      htmlUrl: result.htmlUrl || pr.html_url,
      removedChars: detection.removedChars,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to clean pull request" },
      { status: 500 },
    );
  }
}
