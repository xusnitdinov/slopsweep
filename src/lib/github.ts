import { Octokit } from "@octokit/rest";
import { detectAndClean } from "./detectors";

export function getOctokit(accessToken: string) {
  return new Octokit({
    auth: accessToken,
    userAgent: "SlopSweep/1.0",
  });
}

export type RepoSummary = {
  id: number;
  fullName: string;
  private: boolean;
  htmlUrl: string;
  updatedAt: string;
};

export type ScanResult = {
  hits: ContaminatedPr[];
  prsScanned: number;
  reposWithHits: number;
};

export type ContaminatedPr = {
  repo: string;
  number: number;
  title: string;
  state: string;
  htmlUrl: string;
  body: string;
  cleaned: string;
  matches: { kind: string; label: string; excerpt: string }[];
  removedChars: number;
};

export async function listUserRepos(
  octokit: Octokit,
  options?: { maxRepos?: number },
): Promise<RepoSummary[]> {
  const maxRepos = options?.maxRepos ?? 50;
  const repos: RepoSummary[] = [];

  for await (const response of octokit.paginate.iterator(
    octokit.repos.listForAuthenticatedUser,
    {
      per_page: 50,
      sort: "updated",
      affiliation: "owner,collaborator,organization_member",
    },
  )) {
    for (const repo of response.data) {
      repos.push({
        id: repo.id,
        fullName: repo.full_name,
        private: repo.private,
        htmlUrl: repo.html_url,
        updatedAt: repo.updated_at ?? repo.pushed_at ?? "",
      });
      if (repos.length >= maxRepos) return repos;
    }
  }

  return repos;
}

export async function scanReposForTips(
  octokit: Octokit,
  repoFullNames: string[],
  options?: { prsPerRepo?: number; includeClosed?: boolean },
): Promise<ScanResult> {
  const prsPerRepo = options?.prsPerRepo ?? 30;
  const includeClosed = options?.includeClosed ?? true;
  const hits: ContaminatedPr[] = [];
  let prsScanned = 0;
  const reposHit = new Set<string>();

  for (const fullName of repoFullNames) {
    const [owner, repo] = fullName.split("/");
    if (!owner || !repo) continue;

    const states: Array<"open" | "closed"> = includeClosed
      ? ["open", "closed"]
      : ["open"];

    for (const state of states) {
      try {
        const { data: pulls } = await octokit.pulls.list({
          owner,
          repo,
          state,
          per_page: Math.min(prsPerRepo, 100),
          sort: "updated",
          direction: "desc",
        });

        const batch = pulls.slice(0, prsPerRepo);
        prsScanned += batch.length;

        for (const pr of batch) {
          const body = pr.body ?? "";
          const result = detectAndClean(body);
          if (!result.contaminated) continue;

          reposHit.add(fullName);
          hits.push({
            repo: fullName,
            number: pr.number,
            title: pr.title,
            state: pr.state,
            htmlUrl: pr.html_url,
            body,
            cleaned: result.cleaned,
            matches: result.matches.map((m) => ({
              kind: m.kind,
              label: m.label,
              excerpt: m.excerpt,
            })),
            removedChars: result.removedChars,
          });
        }
      } catch (err) {
        console.warn(`Skip ${fullName} (${state}):`, err);
      }
    }
  }

  return {
    hits,
    prsScanned,
    reposWithHits: reposHit.size,
  };
}

export async function cleanPullRequestBody(
  octokit: Octokit,
  owner: string,
  repo: string,
  number: number,
  cleanedBody: string,
): Promise<{ htmlUrl: string }> {
  // Issues API updates PR body (PRs are issues under the hood)
  const { data } = await octokit.issues.update({
    owner,
    repo,
    issue_number: number,
    body: cleanedBody,
  });

  return { htmlUrl: data.html_url ?? "" };
}

export type ReadmeFile = {
  repo: string;
  path: string | null;
  content: string | null;
  sha: string | null;
  htmlUrl: string;
};

const README_CANDIDATES = [
  "README.md",
  "Readme.md",
  "readme.md",
  "README",
  "README.MD",
];

export async function getRepoReadme(
  octokit: Octokit,
  fullName: string,
): Promise<ReadmeFile> {
  const [owner, repo] = fullName.split("/");
  const htmlUrl = `https://github.com/${fullName}`;
  if (!owner || !repo) {
    return { repo: fullName, path: null, content: null, sha: null, htmlUrl };
  }

  for (const path of README_CANDIDATES) {
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path,
      });
      if (Array.isArray(data) || data.type !== "file" || !("content" in data)) {
        continue;
      }
      const content = Buffer.from(data.content, "base64").toString("utf8");
      return {
        repo: fullName,
        path: data.path,
        content,
        sha: data.sha,
        htmlUrl: data.html_url ?? htmlUrl,
      };
    } catch {
      // try next candidate
    }
  }

  return { repo: fullName, path: null, content: null, sha: null, htmlUrl };
}

export async function updateRepoReadme(
  octokit: Octokit,
  fullName: string,
  path: string,
  content: string,
  options?: { sha?: string | null; message?: string },
): Promise<{ htmlUrl: string }> {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) throw new Error("Invalid repo");

  const { data } = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message:
      options?.message ??
      "chore: update README via SlopSweep",
    content: Buffer.from(content, "utf8").toString("base64"),
    ...(options?.sha ? { sha: options.sha } : {}),
  });

  return {
    htmlUrl:
      data.content?.html_url ??
      data.commit.html_url ??
      `https://github.com/${fullName}`,
  };
}
