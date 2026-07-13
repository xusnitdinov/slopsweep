import { describe, expect, it } from "vitest";
import {
  SAMPLE_CONTAMINATED_PR,
  detectAndClean,
  isContaminated,
} from "./detectors";

describe("detectAndClean", () => {
  it("flags the sample contaminated PR and strips tips", () => {
    const result = detectAndClean(SAMPLE_CONTAMINATED_PR);
    expect(result.contaminated).toBe(true);
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.cleaned).toContain("Fixed the login redirect");
    expect(result.cleaned).not.toMatch(/START COPILOT CODING AGENT TIPS/i);
    expect(result.cleaned).not.toMatch(/Raycast/i);
    expect(result.removedChars).toBeGreaterThan(0);
  });

  it("leaves clean PRs alone", () => {
    const body = "## Summary\nJust a normal fix.\n\nNo tips here.";
    const result = detectAndClean(body);
    expect(result.contaminated).toBe(false);
    expect(result.matches).toHaveLength(0);
    expect(result.cleaned).toBe(body);
  });

  it("handles null and empty", () => {
    expect(detectAndClean(null).contaminated).toBe(false);
    expect(detectAndClean("").contaminated).toBe(false);
    expect(detectAndClean("   ").contaminated).toBe(false);
  });

  it("catches standalone Raycast tip without markers", () => {
    const body = `Bugfix for auth.\n\nQuickly spin up Copilot coding agent tasks from anywhere on your macOS or Windows machine with Raycast.\n`;
    const result = detectAndClean(body);
    expect(result.contaminated).toBe(true);
    expect(result.cleaned).toContain("Bugfix for auth");
    expect(result.cleaned).not.toMatch(/Raycast/i);
  });

  it("isContaminated mirrors detectAndClean", () => {
    expect(isContaminated(SAMPLE_CONTAMINATED_PR)).toBe(true);
    expect(isContaminated("hello")).toBe(false);
  });
});
