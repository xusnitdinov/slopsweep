import { auth } from "@/auth";
import { getOctokit, listUserRepos, scanReposForTips } from "@/lib/github";
import { NextResponse } from "next/server";

async function getAccessToken() {
  const session = await auth();
  return session?.accessToken ?? null;
}

export async function GET() {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const octokit = getOctokit(token);
    const repos = await listUserRepos(octokit, { maxRepos: 80 });
    return NextResponse.json({ repos });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to list repositories" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    repos?: string[];
    prsPerRepo?: number;
    includeClosed?: boolean;
  };

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
    const result = await scanReposForTips(octokit, repos, {
      prsPerRepo: Math.min(body.prsPerRepo ?? 30, 50),
      includeClosed: body.includeClosed ?? true,
    });
    return NextResponse.json({
      hits: result.hits,
      scanned: repos.length,
      prsScanned: result.prsScanned,
      reposWithHits: result.reposWithHits,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
