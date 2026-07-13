import type { Octokit } from "@octokit/rest";

export type SourceSnippet = {
  path: string;
  excerpt: string;
  exports: string[];
  summaryHints: string[];
};

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
  /** Recursive-ish path list (capped) */
  fileTree: string[];
  /** Sampled source files with extracted signals */
  sources: SourceSnippet[];
  /** Inferred routes / pages / endpoints */
  routes: string[];
  /** High-level capabilities deduced from code + tree */
  features: string[];
  /** next | react | python | rust | go | static | unknown */
  projectKind: string;
  pythonReqs: string[];
  existingReadme: string | null;
};

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  "vendor",
  "__pycache__",
  ".venv",
  "venv",
  "target",
]);

const CODE_EXT =
  /\.(tsx?|jsx?|py|rs|go|java|kt|cs|php|rb|vue|svelte|md|html|css)$/i;

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
    const raw = Buffer.from(data.content, "base64").toString("utf8");
    // Cap per file so we stay fast / under memory
    return raw.length > 12_000 ? raw.slice(0, 12_000) : raw;
  } catch {
    return null;
  }
}

async function listDir(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
): Promise<{ name: string; type: string; path: string }[]> {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    if (!Array.isArray(data)) return [];
    return data.map((f) => ({ name: f.name, type: f.type, path: f.path }));
  } catch {
    return [];
  }
}

/** Walk a few levels of the tree without downloading everything. */
async function collectFileTree(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<string[]> {
  const paths: string[] = [];
  const queue: { path: string; depth: number }[] = [{ path: "", depth: 0 }];

  while (queue.length > 0 && paths.length < 120) {
    const item = queue.shift();
    if (!item) break;
    const entries = await listDir(octokit, owner, repo, item.path);
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      if (entry.type === "file") {
        paths.push(entry.path);
      } else if (entry.type === "dir" && item.depth < 3) {
        // Prioritize interesting dirs
        const interesting =
          /^(src|app|lib|pages|components|api|server|backend|frontend|web|cmd|pkg|internal)$/i.test(
            entry.name,
          );
        if (interesting || item.depth < 2) {
          queue.push({ path: entry.path, depth: item.depth + 1 });
        }
      }
      if (paths.length >= 120) break;
    }
  }

  return paths;
}

function scoreSourcePath(path: string): number {
  const p = path.replace(/\\/g, "/").toLowerCase();
  let score = 0;
  if (/(^|\/)(readme|license|changelog)/i.test(p)) score -= 50;
  if (/\.(test|spec|stories)\./i.test(p)) score -= 20;
  if (/(^|\/)(page|layout|main|index|app|server|client|bot|cli)\./i.test(p))
    score += 30;
  if (/(^|\/)(route|api)\./i.test(p)) score += 25;
  if (p.includes("/app/") || p.includes("/src/") || p.includes("/lib/"))
    score += 10;
  if (p.endsWith(".tsx") || p.endsWith(".ts") || p.endsWith(".py")) score += 8;
  if (p.endsWith(".html")) score += 5;
  // Prefer shorter paths (entry points)
  score += Math.max(0, 8 - p.split("/").length);
  return score;
}

function extractExports(code: string, path: string): string[] {
  const found = new Set<string>();
  const patterns = [
    /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g,
    /export\s+(?:default\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)/g,
    /export\s+class\s+([A-Za-z0-9_]+)/g,
    /export\s+(?:const|let|var)\s+([A-Za-z0-9_]+)/g,
    /export\s+default\s+function\s+([A-Za-z0-9_]+)/g,
    /^def\s+([A-Za-z0-9_]+)\s*\(/gm,
    /^class\s+([A-Za-z0-9_]+)\s*[:\(]/gm,
    /fn\s+([A-Za-z0-9_]+)\s*[<\(]/g,
    /func\s+([A-Za-z0-9_]+)\s*\(/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    const r = new RegExp(re.source, re.flags);
    while ((m = r.exec(code)) !== null) {
      if (m[1] && m[1] !== "default") found.add(m[1]);
      if (found.size >= 12) break;
    }
  }
  // Next.js page components often default-export Page
  if (/page\.(tsx?|jsx?)$/i.test(path) && /export\s+default/.test(code)) {
    found.add("Page");
  }
  return [...found].slice(0, 10);
}

function extractHints(code: string, path: string): string[] {
  const hints: string[] = [];
  const head = code.slice(0, 2500);

  // Block / line comments at top
  const block = head.match(/\/\*\*?([\s\S]*?)\*\//);
  if (block?.[1]) {
    const cleaned = block[1]
      .replace(/^\s*\*\s?/gm, "")
      .trim()
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 3)
      .join(" ");
    if (cleaned.length > 20) hints.push(cleaned.slice(0, 220));
  }

  const lineComments = [...head.matchAll(/^\s*\/\/\s*(.+)$/gm)]
    .map((m) => m[1]?.trim() ?? "")
    .filter((l) => l.length > 15 && !l.startsWith("eslint") && !l.startsWith("@"))
    .slice(0, 3);
  hints.push(...lineComments.map((l) => l.slice(0, 180)));

  const pyDoc = head.match(/^\s*(?:async\s+)?def[\s\S]{0,80}?"""([\s\S]*?)"""/m);
  if (pyDoc?.[1]) {
    hints.push(pyDoc[1].trim().split("\n")[0]?.slice(0, 180) ?? "");
  }

  const htmlTitle = head.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (htmlTitle?.[1]) hints.push(`Page title: ${htmlTitle[1].trim()}`);

  // String literals that look like UI copy / product taglines
  const taglines = [
    ...head.matchAll(
      /(?:title|description|headline|tagline)\s*[:=]\s*["'`]([^"'`]{12,120})["'`]/gi,
    ),
  ]
    .map((m) => m[1]?.trim() ?? "")
    .filter(Boolean)
    .slice(0, 3);
  hints.push(...taglines);

  // Auth / API signals
  if (/next-auth|NextAuth|signIn\(/i.test(code)) {
    hints.push("Uses authentication (sign-in flow present)");
  }
  if (/octokit|@octokit/i.test(code)) hints.push("Talks to the GitHub API");
  if (/openai|anthropic|gemini/i.test(code)) {
    hints.push("Integrates with an AI / LLM API");
  }
  if (/telegram|discord\.js|bot\.command/i.test(code)) {
    hints.push("Includes bot / messaging commands");
  }
  if (/canvas|getContext\(['\"]2d/i.test(code)) {
    hints.push("Uses HTML canvas / drawing");
  }
  if (/tailwind|className=/i.test(code) && path.endsWith(".tsx")) {
    hints.push("UI built with React components");
  }

  return [...new Set(hints.filter(Boolean))].slice(0, 8);
}

function detectRoutes(fileTree: string[], sources: SourceSnippet[]): string[] {
  const routes = new Set<string>();

  for (const path of fileTree) {
    const norm = path.replace(/\\/g, "/");
    // App Router pages
    const page = norm.match(
      /(?:^|\/)app\/(.+)\/page\.(tsx?|jsx?)$/i,
    );
    if (page?.[1]) {
      const seg = page[1]
        .replace(/\(.*?\)\//g, "")
        .replace(/\/?\(.*?\)/g, "")
        .replace(/\[(.*?)\]/g, ":$1");
      routes.add(`/${seg === "page" ? "" : seg}`.replace(/\/+/g, "/") || "/");
    }
    if (/(?:^|\/)app\/page\.(tsx?|jsx?)$/i.test(norm)) routes.add("/");

    const api = norm.match(/(?:^|\/)app\/api\/(.+)\/route\.(ts|js)$/i);
    if (api?.[1]) routes.add(`API /api/${api[1]}`);

    const pages = norm.match(/(?:^|\/)pages\/(.+)\.(tsx?|jsx?)$/i);
    if (pages?.[1] && !pages[1].startsWith("api/")) {
      routes.add(`/${pages[1].replace(/index$/i, "").replace(/\[(.*?)\]/g, ":$1")}`);
    }
  }

  for (const s of sources) {
    for (const m of s.excerpt.matchAll(
      /(?:href|redirectTo|pathname)\s*[:=]\s*["'`](\/[^"'`]{1,60})["'`]/g,
    )) {
      if (m[1] && !m[1].startsWith("/api/auth")) routes.add(m[1]);
    }
  }

  return [...routes].slice(0, 20);
}

function inferFeatures(ctx: {
  fileTree: string[];
  sources: SourceSnippet[];
  packageJson: RepoContext["packageJson"];
  routes: string[];
  language: string | null;
}): string[] {
  const feats = new Set<string>();
  const tree = ctx.fileTree.join("\n").toLowerCase();
  const blob = ctx.sources.map((s) => s.excerpt).join("\n");
  const deps = [
    ...(ctx.packageJson?.dependencies ?? []),
    ...(ctx.packageJson?.devDependencies ?? []),
  ];

  if (ctx.routes.some((r) => r.startsWith("API"))) {
    feats.add("HTTP API routes for server-side actions");
  }
  if (ctx.routes.includes("/") || ctx.routes.some((r) => r === "/dashboard")) {
    feats.add("Web UI with routed pages");
  }
  if (/next-auth|signIn\(/.test(blob) || deps.includes("next-auth")) {
    feats.add("User sign-in / OAuth");
  }
  if (/octokit/.test(blob) || deps.some((d) => d.includes("octokit"))) {
    feats.add("GitHub repository integration");
  }
  if (/\.test\.(ts|tsx|js)|vitest|jest|pytest/.test(tree)) {
    feats.add("Automated tests");
  }
  if (/dockerfile|docker-compose/.test(tree)) {
    feats.add("Docker packaging");
  }
  if (/telegram|aiogram|discord/.test(blob + tree)) {
    feats.add("Chat bot commands / messaging");
  }
  if (/canvas|drawing|fabric/.test(blob + tree)) {
    feats.add("Image / canvas drawing tools");
  }
  if (/tailwind|globals\.css/.test(tree) || deps.includes("tailwindcss")) {
    feats.add("Styled frontend (CSS / Tailwind)");
  }
  if (/prisma|mongoose|supabase|drizzle|sqlite|postgres/.test(blob + tree)) {
    feats.add("Persistent data / database layer");
  }
  if (/stripe|payment/.test(blob)) feats.add("Payments integration");
  if (ctx.language === "Python" && /flask|fastapi|django/.test(blob + tree)) {
    feats.add("Python web backend");
  }

  // From export names that sound like features
  for (const s of ctx.sources) {
    for (const name of s.exports) {
      if (/scan|clean|detect|generate|analyze|upload|download|convert/i.test(name)) {
        feats.add(`Code includes \`${name}\` capability`);
      }
    }
    for (const h of s.summaryHints) {
      if (h.length > 25 && h.length < 160 && !h.startsWith("Page title")) {
        feats.add(h);
      }
    }
  }

  return [...feats].slice(0, 10);
}

function inferProjectKind(
  topFiles: string[],
  fileTree: string[],
  deps: string[],
  language: string | null,
): string {
  const files = [...topFiles, ...fileTree].map((f) => f.toLowerCase());
  if (
    files.some((f) => f.includes("next.config")) ||
    deps.includes("next")
  ) {
    return "next";
  }
  if (deps.includes("react") || files.some((f) => f.endsWith(".tsx"))) {
    return "react";
  }
  if (
    files.some((f) => f.endsWith("requirements.txt") || f.endsWith("pyproject.toml")) ||
    language === "Python"
  ) {
    return "python";
  }
  if (files.some((f) => f.endsWith("cargo.toml")) || language === "Rust") {
    return "rust";
  }
  if (files.some((f) => f.endsWith("go.mod")) || language === "Go") return "go";
  if (files.some((f) => f.endsWith(".html"))) return "static";
  return "unknown";
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
        dependencies: Object.keys(parsed.dependencies ?? {}).slice(0, 20),
        devDependencies: Object.keys(parsed.devDependencies ?? {}).slice(0, 12),
      };
    } catch {
      packageJson = null;
    }
  }

  const topEntries = await listDir(octokit, owner, repo, "");
  const topFiles = topEntries.map((e) => e.name).slice(0, 30);
  const fileTree = await collectFileTree(octokit, owner, repo);

  const candidates = fileTree
    .filter((p) => CODE_EXT.test(p) && !/\.d\.ts$/i.test(p))
    .sort((a, b) => scoreSourcePath(b) - scoreSourcePath(a))
    .slice(0, 10);

  const sources: SourceSnippet[] = [];
  for (const path of candidates) {
    const content = await tryGetFile(octokit, owner, repo, path);
    if (!content) continue;
    sources.push({
      path,
      excerpt: content.slice(0, 3500),
      exports: extractExports(content, path),
      summaryHints: extractHints(content, path),
    });
  }

  const routes = detectRoutes(fileTree, sources);
  const deps = [
    ...(packageJson?.dependencies ?? []),
    ...(packageJson?.devDependencies ?? []),
  ];
  const projectKind = inferProjectKind(
    topFiles,
    fileTree,
    deps,
    meta.language,
  );
  const features = inferFeatures({
    fileTree,
    sources,
    packageJson,
    routes,
    language: meta.language,
  });

  let pythonReqs: string[] = [];
  const reqs = await tryGetFile(octokit, owner, repo, "requirements.txt");
  if (reqs) {
    pythonReqs = reqs
      .split("\n")
      .map((l) => l.trim().split(/[=<>!~]/)[0] ?? "")
      .filter((l) => l && !l.startsWith("#"))
      .slice(0, 15);
  }

  const existingReadme =
    (await tryGetFile(octokit, owner, repo, "README.md")) ||
    (await tryGetFile(octokit, owner, repo, "readme.md"));

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
    fileTree,
    sources,
    routes,
    features,
    projectKind,
    pythonReqs,
    existingReadme: existingReadme?.slice(0, 2000) ?? null,
  };
}

function inferStack(ctx: RepoContext): string[] {
  const stack: string[] = [];
  if (ctx.language) stack.push(ctx.language);
  const files = [...ctx.topFiles, ...ctx.fileTree].map((f) => f.toLowerCase());
  const deps = [
    ...(ctx.packageJson?.dependencies ?? []),
    ...(ctx.packageJson?.devDependencies ?? []),
  ];
  if (ctx.projectKind === "next" || deps.includes("next")) stack.push("Next.js");
  if (deps.includes("react") || deps.includes("react-dom")) stack.push("React");
  if (deps.includes("tailwindcss")) stack.push("Tailwind CSS");
  if (deps.includes("next-auth") || deps.includes("@auth/core")) {
    stack.push("Auth.js");
  }
  if (deps.some((d) => d.includes("octokit"))) stack.push("Octokit");
  if (deps.includes("vitest") || deps.includes("jest")) stack.push("Vitest/Jest");
  if (files.some((f) => f.includes("dockerfile"))) stack.push("Docker");
  if (ctx.pythonReqs.length) stack.push("Python");
  for (const r of ctx.pythonReqs.slice(0, 5)) {
    if (/flask|fastapi|django|aiogram|telegram|opencv|numpy|pandas/i.test(r)) {
      stack.push(r);
    }
  }
  if (files.some((f) => f.endsWith("cargo.toml"))) stack.push("Rust");
  if (files.some((f) => f.endsWith("go.mod"))) stack.push("Go");
  return [...new Set(stack)];
}

function pickScripts(scripts?: Record<string, string>) {
  if (!scripts) return [];
  const preferred = ["dev", "start", "build", "test", "lint"];
  return preferred.filter((k) => scripts[k]);
}

function structureOutline(fileTree: string[]): string[] {
  const roots = new Set<string>();
  for (const p of fileTree) {
    const parts = p.replace(/\\/g, "/").split("/");
    if (parts.length === 1) roots.add(parts[0]!);
    else if (parts[0]) roots.add(`${parts[0]}/`);
  }
  return [...roots].sort().slice(0, 14);
}

function bestBlurb(ctx: RepoContext): string {
  if (ctx.description?.trim()) return ctx.description.trim();
  if (ctx.packageJson?.description?.trim()) {
    return ctx.packageJson.description.trim();
  }

  const hint = ctx.sources
    .flatMap((s) => s.summaryHints)
    .find((h) => h.length > 30 && !h.startsWith("Uses ") && !h.startsWith("UI "));
  if (hint) return hint;

  const kindLabel: Record<string, string> = {
    next: "Next.js web app",
    react: "React application",
    python: "Python project",
    rust: "Rust project",
    go: "Go project",
    static: "static web project",
    unknown: "software project",
  };
  const kind = kindLabel[ctx.projectKind] ?? "software project";
  if (ctx.features[0]) {
    return `${ctx.name} is a ${kind}. ${ctx.features[0]}.`;
  }
  return `${ctx.name} is a ${kind}${ctx.language ? ` written in ${ctx.language}` : ""}.`;
}

/** Smart local draft — inspects tree + source signals (no API key). */
export function draftReadmeFromContext(ctx: RepoContext): string {
  const title = ctx.name;
  const blurb = bestBlurb(ctx);
  const stack = inferStack(ctx);
  const scripts = pickScripts(ctx.packageJson?.scripts);
  const hasPkg = Boolean(ctx.packageJson);
  const outline = structureOutline(ctx.fileTree);

  const lines: string[] = [`# ${title}`, "", blurb, ""];

  if (ctx.topics.length > 0) {
    lines.push(ctx.topics.map((t) => `\`${t}\``).join(" · "), "");
  }

  lines.push("## Overview", "", blurb, "");

  if (ctx.features.length > 0) {
    lines.push("## Features", "");
    for (const f of ctx.features) lines.push(`- ${f}`);
    lines.push("");
  }

  if (ctx.routes.length > 0) {
    lines.push("## Routes & surfaces", "");
    for (const r of ctx.routes.slice(0, 12)) lines.push(`- \`${r}\``);
    lines.push("");
  }

  if (stack.length > 0) {
    lines.push("## Stack", "");
    for (const s of stack) lines.push(`- ${s}`);
    lines.push("");
  }

  if (outline.length > 0) {
    lines.push("## Project layout", "", "```text");
    for (const o of outline) lines.push(o);
    lines.push("```", "");
  }

  const notable = ctx.sources
    .filter((s) => s.exports.length > 0 || s.summaryHints.length > 0)
    .slice(0, 5);
  if (notable.length > 0) {
    lines.push("## Notable code", "");
    for (const s of notable) {
      const bits = [
        s.exports.length ? `exports: ${s.exports.slice(0, 5).join(", ")}` : "",
        s.summaryHints[0] ?? "",
      ].filter(Boolean);
      lines.push(`- \`${s.path}\`${bits.length ? ` — ${bits.join(" · ")}` : ""}`);
    }
    lines.push("");
  }

  if (hasPkg) {
    lines.push("## Getting started", "", "```bash", "npm install", "```", "");
    if (scripts.includes("dev")) {
      lines.push(
        "Development server:",
        "",
        "```bash",
        "npm run dev",
        "```",
        "",
      );
    } else if (scripts.includes("start")) {
      lines.push("Run:", "", "```bash", "npm start", "```", "");
    }
    if (scripts.includes("build")) {
      lines.push("Build:", "", "```bash", "npm run build", "```", "");
    }
    if (scripts.includes("test")) {
      lines.push("Tests:", "", "```bash", "npm test", "```", "");
    }
  } else if (ctx.projectKind === "python" || ctx.pythonReqs.length > 0) {
    const isBot =
      ctx.pythonReqs.some((r) => /aiogram|telegram|pyrogram|discord/i.test(r)) ||
      ctx.features.some((f) => /bot/i.test(f)) ||
      /bot/i.test(ctx.name);
    lines.push(
      "## Getting started",
      "",
      "```bash",
      "python -m venv .venv",
      "# Windows: .venv\\Scripts\\activate",
      "pip install -r requirements.txt",
      "```",
      "",
    );
    if (isBot) {
      lines.push(
        "Create a `.env` (or local config) with your bot token, then run the main module listed under Notable code.",
        "",
      );
    }
  } else if (ctx.projectKind === "static") {
    lines.push(
      "## Getting started",
      "",
      "Open `index.html` in a browser, or serve the folder locally:",
      "",
      "```bash",
      "npx serve .",
      "```",
      "",
    );
  } else if (ctx.projectKind === "rust") {
    lines.push(
      "## Getting started",
      "",
      "```bash",
      "cargo build",
      "cargo run",
      "```",
      "",
    );
  } else if (ctx.projectKind === "go") {
    lines.push(
      "## Getting started",
      "",
      "```bash",
      "go mod tidy",
      "go run .",
      "```",
      "",
    );
  } else {
    lines.push(
      "## Getting started",
      "",
      `Clone and explore. Default branch: \`${ctx.defaultBranch}\`.`,
      "",
      "```bash",
      `git clone ${ctx.htmlUrl}.git`,
      `cd ${ctx.name}`,
      "```",
      "",
    );
  }

  if (ctx.homepage) {
    lines.push(
      "## Links",
      "",
      `- Live / docs: ${ctx.homepage}`,
      `- Repository: ${ctx.htmlUrl}`,
      "",
    );
  } else {
    lines.push("## Links", "", `- Repository: ${ctx.htmlUrl}`, "");
  }

  if (ctx.license) {
    lines.push("## License", "", `${ctx.license}`, "");
  }

  lines.push(
    "---",
    "",
    "_Draft generated by SlopSweep after scanning the repository tree and sample source files. Edit before relying on it._",
    "",
  );

  return lines.join("\n");
}

export async function generateReadmeWithOptionalLlm(
  ctx: RepoContext,
): Promise<{ content: string; mode: "openai" | "smart" }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { content: draftReadmeFromContext(ctx), mode: "smart" };
  }

  try {
    // Send a compact analysis payload — not full source dumps
    const compact = {
      name: ctx.name,
      description: ctx.description,
      homepage: ctx.homepage,
      language: ctx.language,
      topics: ctx.topics,
      license: ctx.license,
      projectKind: ctx.projectKind,
      stackHints: inferStack(ctx),
      features: ctx.features,
      routes: ctx.routes,
      scripts: ctx.packageJson?.scripts ?? null,
      dependencies: ctx.packageJson?.dependencies?.slice(0, 15) ?? [],
      layout: structureOutline(ctx.fileTree),
      sources: ctx.sources.map((s) => ({
        path: s.path,
        exports: s.exports,
        hints: s.summaryHints,
        excerpt: s.excerpt.slice(0, 800),
      })),
      existingReadme: ctx.existingReadme,
    };

    const prompt = `Write a clean, professional README.md for this GitHub repository.
You are given structured analysis from scanning the repo (file tree, routes, exports, comment hints).
Use ONLY facts supported by that analysis. Do not invent APIs or features.
Include: title, overview, features, stack, getting started, and license if known.
No emojis. No hype. Under 140 lines. Markdown only.

Analysis JSON:
${JSON.stringify(compact, null, 2)}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.35,
        messages: [
          {
            role: "system",
            content:
              "You write accurate README.md files from repository analysis. Output markdown only.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      console.warn("OpenAI README generate failed", await res.text());
      return { content: draftReadmeFromContext(ctx), mode: "smart" };
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return { content: draftReadmeFromContext(ctx), mode: "smart" };
    }
    return { content, mode: "openai" };
  } catch (err) {
    console.warn(err);
    return { content: draftReadmeFromContext(ctx), mode: "smart" };
  }
}
