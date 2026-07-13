import type { Octokit } from "@octokit/rest";

export type RepoContext = {
  fullName: string;
  name: string;
  description: string | null;
  htmlUrl: string;
  homepage: string | null;
  language: string | null;
  topics: string[];
  license: string | null;
  defaultBranch: string;
  stars: number;
  packageJson: {
    name?: string;
    description?: string;
    scripts?: Record<string, string>;
    dependencies?: string[];
    devDependencies?: string[];
  } | null;
  topFiles: string[];
};

async function tryGetFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
): Promise<string | null> {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    if (Array.isArray(data) || data.type !== "file" || !("content" in data)) {
      return null;
    }
    return Buffer.from(data.content, "base64").toString("utf8");
  } catch {
    return null;
  }
}

export async function gatherRepoContext(
  octokit: Octokit,
  fullName: string,
): Promise<RepoContext> {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) throw new Error("Invalid repo");

  const { data: meta } = await octokit.repos.get({ owner, repo });

  let packageJson: RepoContext["packageJson"] = null;
  const rawPkg = await tryGetFile(octokit, owner, repo, "package.json");
  if (rawPkg) {
    try {
      const parsed = JSON.parse(rawPkg) as {
        name?: string;
        description?: string;
        scripts?: Record<string, string>;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      packageJson = {
        name: parsed.name,
        description: parsed.description,
        scripts: parsed.scripts,
        dependencies: Object.keys(parsed.dependencies ?? {}).slice(0, 12),
        devDependencies: Object.keys(parsed.devDependencies ?? {}).slice(0, 8),
      };
    } catch {
      packageJson = null;
    }
  }

  let topFiles: string[] = [];
  try {
    const { data: tree } = await octokit.repos.getContent({
      owner,
      repo,
      path: "",
    });
    if (Array.isArray(tree)) {
      topFiles = tree.map((f) => f.name).slice(0, 20);
    }
  } catch {
    topFiles = [];
  }

  return {
    fullName,
    name: meta.name,
    description: meta.description,
    htmlUrl: meta.html_url,
    homepage: meta.homepage || null,
    language: meta.language,
    topics: meta.topics ?? [],
    license: meta.license?.spdx_id ?? meta.license?.name ?? null,
    defaultBranch: meta.default_branch,
    stars: meta.stargazers_count,
    packageJson,
    topFiles,
  };
}

function inferStack(ctx: RepoContext): string[] {
  const stack: string[] = [];
  if (ctx.language) stack.push(ctx.language);
  const files = ctx.topFiles.map((f) => f.toLowerCase());
  const deps = [
    ...(ctx.packageJson?.dependencies ?? []),
    ...(ctx.packageJson?.devDependencies ?? []),
  ];
  if (files.includes("next.config.ts") || files.includes("next.config.js") || deps.includes("next")) {
    stack.push("Next.js");
  }
  if (deps.includes("react") || deps.includes("react-dom")) stack.push("React");
  if (deps.includes("tailwindcss")) stack.push("Tailwind CSS");
  if (files.includes("dockerfile")) stack.push("Docker");
  if (files.includes("requirements.txt") || files.includes("pyproject.toml")) {
    stack.push("Python");
  }
  if (files.includes("cargo.toml")) stack.push("Rust");
  if (files.includes("go.mod")) stack.push("Go");
  return [...new Set(stack)];
}

function pickScripts(scripts?: Record<string, string>) {
  if (!scripts) return [];
  const preferred = ["dev", "start", "build", "test", "lint"];
  return preferred.filter((k) => scripts[k]);
}

/** Local “AI” draft from repo metadata — works without an API key. */
export function draftReadmeFromContext(ctx: RepoContext): string {
  const title = ctx.name;
  const blurb =
    ctx.description ||
    ctx.packageJson?.description ||
    `${title} — a ${ctx.language ?? "software"} project.`;
  const stack = inferStack(ctx);
  const scripts = pickScripts(ctx.packageJson?.scripts);
  const hasPkg = Boolean(ctx.packageJson);

  const lines: string[] = [
    `# ${title}`,
    "",
    blurb,
    "",
  ];

  if (ctx.topics.length > 0) {
    lines.push(ctx.topics.map((t) => `\`${t}\``).join(" · "), "");
  }

  lines.push("## Overview", "", blurb, "");

  if (stack.length > 0) {
    lines.push("## Stack", "");
    for (const s of stack) lines.push(`- ${s}`);
    lines.push("");
  }

  if (hasPkg) {
    lines.push("## Getting started", "", "```bash", "npm install", "```", "");
    if (scripts.includes("dev")) {
      lines.push("Start the development server:", "", "```bash", "npm run dev", "```", "");
    } else if (scripts.includes("start")) {
      lines.push("Run the app:", "", "```bash", "npm start", "```", "");
    }
    if (scripts.includes("build")) {
      lines.push("Production build:", "", "```bash", "npm run build", "```", "");
    }
    if (scripts.includes("test")) {
      lines.push("Tests:", "", "```bash", "npm test", "```", "");
    }
  } else if (ctx.language === "Python") {
    lines.push(
      "## Getting started",
      "",
      "```bash",
      "python -m venv .venv",
      "# activate, then:",
      "pip install -r requirements.txt",
      "```",
      "",
    );
  } else {
    lines.push(
      "## Getting started",
      "",
      `Clone the repo and open it in your editor. Default branch: \`${ctx.defaultBranch}\`.`,
      "",
      "```bash",
      `git clone ${ctx.htmlUrl}.git`,
      `cd ${ctx.name}`,
      "```",
      "",
    );
  }

  if (ctx.homepage) {
    lines.push("## Links", "", `- Live / docs: ${ctx.homepage}`, `- Repository: ${ctx.htmlUrl}`, "");
  } else {
    lines.push("## Links", "", `- Repository: ${ctx.htmlUrl}`, "");
  }

  if (ctx.license) {
    lines.push("## License", "", `${ctx.license}`, "");
  }

  lines.push(
    "---",
    "",
    "_Draft generated by SlopSweep from repository metadata. Edit before relying on it._",
    "",
  );

  return lines.join("\n");
}

export async function generateReadmeWithOptionalLlm(
  ctx: RepoContext,
): Promise<{ content: string; mode: "openai" | "metadata" }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { content: draftReadmeFromContext(ctx), mode: "metadata" };
  }

  try {
    const prompt = `Write a clean, professional README.md for this GitHub repository.
Use markdown. Include: title, short description, stack, getting started, and license if known.
Do NOT invent features that aren't implied by the data. No emojis. No filler marketing.
Keep it under 120 lines.

Repo data (JSON):
${JSON.stringify(ctx, null, 2)}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "You write concise README.md files for developers. Output markdown only.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      console.warn("OpenAI README generate failed", await res.text());
      return { content: draftReadmeFromContext(ctx), mode: "metadata" };
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return { content: draftReadmeFromContext(ctx), mode: "metadata" };
    }
    return { content, mode: "openai" };
  } catch (err) {
    console.warn(err);
    return { content: draftReadmeFromContext(ctx), mode: "metadata" };
  }
}
