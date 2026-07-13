import { auth } from "@/auth";
import {
  gatherRepoContext,
  generateReadmeWithOptionalLlm,
} from "@/lib/readme-ai";
import { getOctokit } from "@/lib/github";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { repo?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.repo) {
    return NextResponse.json({ error: "repo is required" }, { status: 400 });
  }

  try {
    const octokit = getOctokit(token);
    const ctx = await gatherRepoContext(octokit, body.repo);
    const { content, mode } = await generateReadmeWithOptionalLlm(ctx);
    return NextResponse.json({
      ok: true,
      repo: body.repo,
      content,
      mode,
      context: {
        name: ctx.name,
        language: ctx.language,
        description: ctx.description,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to generate README" },
      { status: 500 },
    );
  }
}
