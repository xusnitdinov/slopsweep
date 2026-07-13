import { diffLines } from "./diff";
import { describe, expect, it } from "vitest";

describe("diffLines", () => {
  it("marks added and removed lines", () => {
    const lines = diffLines("a\nb\nc", "a\nx\nc");
    expect(lines.some((l) => l.type === "del" && l.text === "b")).toBe(true);
    expect(lines.some((l) => l.type === "add" && l.text === "x")).toBe(true);
    expect(lines.filter((l) => l.type === "same").length).toBe(2);
  });
});
