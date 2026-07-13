import { auth } from "@/auth";
import { getOctokit } from "@/lib/github";
import { NextResponse } from "next/server";

/** Restore a previous PR description from history (undo). */
export async function POST(request: Request) {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { repo?: string; number?: number; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.repo || typeof body.number !== "number" || typeof body.body !== "string") {
    return NextResponse.json(
      { error: "repo, number, and body are required" },
      { status: 400 },
    );
  }

  const [owner, repo] = body.repo.split("/");
  if (!owner || !repo) {
    return NextResponse.json({ error: "Invalid repo" }, { status: 400 });
  }

  try {
    const octokit = getOctokit(token);
    const { data } = await octokit.issues.update({
      owner,
      repo,
      issue_number: body.number,
      body: body.body,
    });
    return NextResponse.json({
      ok: true,
      htmlUrl: data.html_url,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Restore failed" }, { status: 500 });
  }
}
