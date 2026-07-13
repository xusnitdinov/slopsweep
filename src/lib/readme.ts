import { detectAndClean } from "./detectors";

export type ReadmeIssue = {
  id: string;
  severity: "error" | "warn" | "info";
  label: string;
  detail: string;
};

export type ReadmeAnalysis = {
  path: string | null;
  content: string;
  tipDetection: ReturnType<typeof detectAndClean>;
  issues: ReadmeIssue[];
  score: number;
};

const PLACEHOLDER_PATTERNS: { id: string; label: string; pattern: RegExp }[] = [
  {
    id: "todo",
    label: "TODO placeholder",
    pattern: /\bTODO\b|\bTBD\b|\bFIXME\b/i,
  },
  {
    id: "lorem",
    label: "Lorem ipsum",
    pattern: /lorem ipsum/i,
  },
  {
    id: "replace-me",
    label: "Template leftover",
    pattern: /replace this|your description here|add your|coming soon/i,
  },
  {
    id: "chatgpt",
    label: "AI boilerplate tone",
    pattern:
      /in today's (?:fast[- ]paced|digital)|welcome to my (?:awesome )?repository|this (?:powerful|robust) (?:tool|solution) (?:allows|enables) you to/i,
  },
];

export function analyzeReadme(
  content: string | null,
  path: string | null,
): ReadmeAnalysis {
  const text = content ?? "";
  const tipDetection = detectAndClean(text);
  const issues: ReadmeIssue[] = [];

  if (!path || !content) {
    issues.push({
      id: "missing",
      severity: "error",
      label: "No README",
      detail: "This repository has no README.md (or README) at the root.",
    });
    return {
      path,
      content: "",
      tipDetection,
      issues,
      score: 0,
    };
  }

  if (text.trim().length < 40) {
    issues.push({
      id: "too-short",
      severity: "error",
      label: "Too short",
      detail: "README is under 40 characters — visitors get almost no context.",
    });
  } else if (text.trim().length < 200) {
    issues.push({
      id: "thin",
      severity: "warn",
      label: "Thin README",
      detail: "Under 200 characters. Add what the project does and how to run it.",
    });
  }

  if (!/^#\s+\S+/m.test(text)) {
    issues.push({
      id: "no-title",
      severity: "warn",
      label: "Missing title",
      detail: "No top-level `# Heading` found.",
    });
  }

  const hasInstall =
    /##?\s*(install|getting started|setup|quick ?start)/i.test(text) ||
    /npm install|pnpm install|yarn|pip install|cargo install/i.test(text);
  if (!hasInstall && text.length > 80) {
    issues.push({
      id: "no-install",
      severity: "info",
      label: "No install section",
      detail: "Consider documenting how someone runs or installs the project.",
    });
  }

  if (tipDetection.contaminated) {
    issues.push({
      id: "copilot-tips",
      severity: "error",
      label: "Copilot tip residue",
      detail: `Found ${tipDetection.matches.length} tip match(es) · ${tipDetection.removedChars} chars removable.`,
    });
  }

  for (const p of PLACEHOLDER_PATTERNS) {
    if (p.pattern.test(text)) {
      issues.push({
        id: p.id,
        severity: p.id === "chatgpt" ? "warn" : "warn",
        label: p.label,
        detail: "Looks like unfinished template or AI filler text.",
      });
    }
  }

  let score = 100;
  for (const issue of issues) {
    if (issue.severity === "error") score -= 25;
    else if (issue.severity === "warn") score -= 12;
    else score -= 5;
  }
  score = Math.max(0, Math.min(100, score));

  return {
    path,
    content: text,
    tipDetection,
    issues,
    score,
  };
}
