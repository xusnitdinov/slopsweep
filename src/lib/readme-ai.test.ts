import { draftReadmeFromContext, type RepoContext } from "./readme-ai";
import { describe, expect, it } from "vitest";

const sample: RepoContext = {
  fullName: "xusnitdinov/demo",
  name: "demo",
  description: "A small demo app",
  htmlUrl: "https://github.com/xusnitdinov/demo",
  homepage: null,
  language: "TypeScript",
  topics: ["demo"],
  license: "MIT",
  defaultBranch: "main",
  stars: 0,
  packageJson: {
    name: "demo",
    scripts: { dev: "next dev", build: "next build", test: "vitest run" },
    dependencies: ["next", "react", "next-auth"],
    devDependencies: ["typescript", "vitest"],
  },
  topFiles: ["package.json", "src", "next.config.ts"],
  fileTree: [
    "package.json",
    "next.config.ts",
    "src/app/page.tsx",
    "src/app/dashboard/page.tsx",
    "src/app/api/scan/route.ts",
    "src/lib/detectors.ts",
  ],
  sources: [
    {
      path: "src/app/page.tsx",
      excerpt:
        '/** Landing page for the demo scanner. */\nexport default function Page() { return <h1>demo</h1> }',
      exports: ["Page"],
      summaryHints: ["Landing page for the demo scanner."],
    },
    {
      path: "src/lib/detectors.ts",
      excerpt:
        "export function detectAndClean(text: string) { return text }",
      exports: ["detectAndClean"],
      summaryHints: ["Code includes detectAndClean capability"],
    },
  ],
  routes: ["/", "/dashboard", "API /api/scan"],
  features: [
    "Web UI with routed pages",
    "HTTP API routes for server-side actions",
    "User sign-in / OAuth",
  ],
  projectKind: "next",
  pythonReqs: [],
  existingReadme: null,
};

describe("draftReadmeFromContext", () => {
  it("builds a usable README with title and install", () => {
    const md = draftReadmeFromContext(sample);
    expect(md).toContain("# demo");
    expect(md).toContain("npm install");
    expect(md).toContain("npm run dev");
    expect(md).toContain("MIT");
  });

  it("includes features and routes learned from code analysis", () => {
    const md = draftReadmeFromContext(sample);
    expect(md).toContain("## Features");
    expect(md).toContain("/dashboard");
    expect(md).toContain("detectAndClean");
    expect(md).toContain("## Notable code");
    expect(md).toContain("src/lib/detectors.ts");
  });
});
