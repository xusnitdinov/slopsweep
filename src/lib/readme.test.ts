import { analyzeReadme } from "./readme";
import { describe, expect, it } from "vitest";

describe("analyzeReadme", () => {
  it("flags missing README", () => {
    const result = analyzeReadme(null, null);
    expect(result.score).toBe(0);
    expect(result.issues.some((i) => i.id === "missing")).toBe(true);
  });

  it("flags tip residue and placeholders", () => {
    const body = `# Project

TODO add docs

<!-- START COPILOT CODING AGENT TIPS -->
Try Raycast to spin up Copilot tasks from anywhere
<!-- END COPILOT CODING AGENT TIPS -->
`;
    const result = analyzeReadme(body, "README.md");
    expect(result.tipDetection.contaminated).toBe(true);
    expect(result.issues.some((i) => i.id === "copilot-tips")).toBe(true);
    expect(result.issues.some((i) => i.id === "todo")).toBe(true);
  });

  it("scores a solid README higher", () => {
    const body = `# SlopSweep

Cleanup tool for Copilot tip residue.

## Install

\`\`\`bash
npm install
npm run dev
\`\`\`
`;
    const result = analyzeReadme(body, "README.md");
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.issues.some((i) => i.id === "missing")).toBe(false);
    expect(result.issues.some((i) => i.id === "copilot-tips")).toBe(false);
  });
});
