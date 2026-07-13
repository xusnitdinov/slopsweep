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
    scripts: { dev: "next dev", build: "next build" },
    dependencies: ["next", "react"],
    devDependencies: ["typescript"],
  },
  topFiles: ["package.json", "src", "next.config.ts"],
};

describe("draftReadmeFromContext", () => {
  it("builds a usable README with title and install", () => {
    const md = draftReadmeFromContext(sample);
    expect(md).toContain("# demo");
    expect(md).toContain("npm install");
    expect(md).toContain("npm run dev");
    expect(md).toContain("MIT");
  });
});
