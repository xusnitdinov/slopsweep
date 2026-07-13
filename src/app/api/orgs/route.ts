import { auth } from "@/auth";
import { getOctokit, listUserOrgs, listUserRepos } from "@/lib/github";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const affiliation = searchParams.get("affiliation") ?? "all";
  const owner = searchParams.get("owner");

  const affiliationMap: Record<string, string> = {
    all: "owner,collaborator,organization_member",
    owner: "owner",
    collaborator: "collaborator",
    org: "organization_member",
  };

  try {
    const octokit = getOctokit(token);
    const [orgs, repos] = await Promise.all([
      listUserOrgs(octokit),
      listUserRepos(octokit, {
        maxRepos: 120,
        affiliation: affiliationMap[affiliation] ?? affiliationMap.all,
        owner: owner || null,
      }),
    ]);
    return NextResponse.json({ orgs, repos });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to list orgs/repos" }, { status: 500 });
  }
}
