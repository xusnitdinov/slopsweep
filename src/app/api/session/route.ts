import { getOctokit } from "@/lib/github";
import {
  clearSessionCookie,
  readSession,
  setSessionCookie,
} from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({
    authenticated: true,
    login: session.login,
    name: session.name,
    avatarUrl: session.avatarUrl,
  });
}

export async function POST(request: Request) {
  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  try {
    const octokit = getOctokit(token);
    const { data: user } = await octokit.users.getAuthenticated();
    await setSessionCookie({
      login: user.login,
      name: user.name,
      avatarUrl: user.avatar_url,
      token,
    });
    return NextResponse.json({
      ok: true,
      login: user.login,
      name: user.name,
      avatarUrl: user.avatar_url,
    });
  } catch {
    return NextResponse.json(
      { error: "GitHub rejected that token. Check it and try again." },
      { status: 401 },
    );
  }
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
