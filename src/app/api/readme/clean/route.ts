import { auth } from "@/auth";
import { detectAndClean } from "@/lib/detectors";
import { getOctokit, getRepoReadme, updateRepoReadme } from "@/lib/github";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    repo?: string;
    cleaned?: string;
    dryRun?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fullName = body.repo;
  if (!fullName) {
    return NextResponse.json({ error: "repo is required" }, { status: 400 });
  }

  try {
    const octokit = getOctokit(token);
    const file = await getRepoReadme(octokit, fullName);
    if (!file.path || !file.sha || file.content == null) {
      return NextResponse.json(
        { error: "No README found to update" },
        { status: 404 },
      );
    }

    const detection = detectAndClean(file.content);
    const cleaned =
      typeof body.cleaned === "string" && body.cleaned.length > 0
        ? body.cleaned
        : detection.cleaned;

    if (!detection.contaminated && cleaned === file.content) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        message: "README is already clean",
        htmlUrl: file.htmlUrl,
      });
    }

    if (body.dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        before: file.content,
        after: cleaned,
        matches: detection.matches,
        htmlUrl: file.htmlUrl,
      });
    }

    const result = await updateRepoReadme(
      octokit,
      fullName,
      file.path,
      file.sha,
      cleaned,
    );

    return NextResponse.json({
      ok: true,
      cleaned: true,
      htmlUrl: result.htmlUrl,
      removedChars: detection.removedChars,
      path: file.path,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to update README" },
      { status: 500 },
    );
  }
}
