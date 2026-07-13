/**
 * Detects and strips Copilot-injected product "tips" from PR bodies.
 * Markers and phrases from the March 2026 Copilot tips incident.
 */

export type DetectionMatch = {
  kind: "marker_block" | "promo_phrase";
  label: string;
  start: number;
  end: number;
  excerpt: string;
};

export type DetectionResult = {
  contaminated: boolean;
  matches: DetectionMatch[];
  cleaned: string;
  removedChars: number;
};

/** HTML comment markers used to wrap Copilot tips */
const MARKER_BLOCK =
  /(?:^|\n)[ \t]*(?:<!--\s*)?START\s+COPILOT\s+CODING\s+AGENT\s+TIPS\s*(?:-->)?[\s\S]*?(?:(?:<!--\s*)?END\s+COPILOT\s+CODING\s+AGENT\s+TIPS\s*(?:-->)?|(?=<!--\s*END)|$)/gi;

/** Known promo lines / phrases from the incident (case-insensitive) */
const PROMO_PATTERNS: { label: string; pattern: RegExp }[] = [
  {
    label: "Raycast tip",
    pattern:
      /(?:^|\n)[ \t]*(?:[-*•]\s*)?Quickly spin up Copilot coding agent tasks from anywhere[^\n]*(?:\n[ \t]*https?:\/\/[^\n]+)?/gi,
  },
  {
    label: "Raycast product tip",
    pattern:
      /(?:^|\n)[ \t]*(?:[-*•]\s*)?(?:Try|Use)\s+Raycast[^\n]*Copilot[^\n]*(?:\n[ \t]*https?:\/\/[^\n]+)?/gi,
  },
  {
    label: "Slack integration tip",
    pattern:
      /(?:^|\n)[ \t]*(?:[-*•]\s*)?(?:Start|Try|Use|Monitor).*Copilot.*(?:from|in|via)\s+Slack[^\n]*(?:\n[ \t]*https?:\/\/[^\n]+)?/gi,
  },
  {
    label: "Teams integration tip",
    pattern:
      /(?:^|\n)[ \t]*(?:[-*•]\s*)?(?:Start|Try|Use|Monitor).*Copilot.*(?:from|in|via)\s+(?:Microsoft\s+)?Teams[^\n]*(?:\n[ \t]*https?:\/\/[^\n]+)?/gi,
  },
  {
    label: "VS Code tip",
    pattern:
      /(?:^|\n)[ \t]*(?:[-*•]\s*)?(?:Start|Try|Use|Launch).*Copilot.*(?:from|in)\s+VS\s*Code[^\n]*(?:\n[ \t]*https?:\/\/[^\n]+)?/gi,
  },
  {
    label: "Visual Studio tip",
    pattern:
      /(?:^|\n)[ \t]*(?:[-*•]\s*)?(?:Start|Try|Use|Launch).*Copilot.*(?:from|in)\s+Visual\s+Studio(?!\s*Code)[^\n]*(?:\n[ \t]*https?:\/\/[^\n]+)?/gi,
  },
  {
    label: "JetBrains tip",
    pattern:
      /(?:^|\n)[ \t]*(?:[-*•]\s*)?(?:Start|Try|Use|Launch).*Copilot.*(?:from|in)\s+JetBrains[^\n]*(?:\n[ \t]*https?:\/\/[^\n]+)?/gi,
  },
  {
    label: "Eclipse tip",
    pattern:
      /(?:^|\n)[ \t]*(?:[-*•]\s*)?(?:Start|Try|Use|Launch).*Copilot.*(?:from|in)\s+Eclipse[^\n]*(?:\n[ \t]*https?:\/\/[^\n]+)?/gi,
  },
];

function collectRegexMatches(
  text: string,
  pattern: RegExp,
  kind: DetectionMatch["kind"],
  label: string,
): DetectionMatch[] {
  const matches: DetectionMatch[] = [];
  const re = new RegExp(pattern.source, pattern.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[0];
    // Prefer stripping from the newline so we don't leave double newlines awkwardly —
    // keep start at match index as-is.
    const start = m.index;
    const end = start + raw.length;
    matches.push({
      kind,
      label,
      start,
      end,
      excerpt: raw.trim().slice(0, 160),
    });
  }
  return matches;
}

function mergeOverlapping(matches: DetectionMatch[]): DetectionMatch[] {
  if (matches.length === 0) return [];
  const sorted = [...matches].sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: DetectionMatch[] = [];
  for (const m of sorted) {
    const last = merged[merged.length - 1];
    if (last && m.start < last.end) {
      // Prefer longer / earlier span; extend if needed and keep first label
      if (m.end > last.end) {
        last.end = m.end;
        last.excerpt = `${last.excerpt} …`;
      }
      continue;
    }
    merged.push({ ...m });
  }
  return merged;
}

function stripRanges(text: string, ranges: DetectionMatch[]): string {
  if (ranges.length === 0) return text;
  const sorted = [...ranges].sort((a, b) => b.start - a.start);
  let out = text;
  for (const r of sorted) {
    out = out.slice(0, r.start) + out.slice(r.end);
  }
  // Collapse excessive blank lines left behind
  return out
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trimEnd()
    .replace(/^\n+/, "");
}

/**
 * Analyze a PR body and return matches + a cleaned version.
 */
export function detectAndClean(body: string | null | undefined): DetectionResult {
  const text = body ?? "";
  if (!text.trim()) {
    return { contaminated: false, matches: [], cleaned: text, removedChars: 0 };
  }

  const all: DetectionMatch[] = [
    ...collectRegexMatches(text, MARKER_BLOCK, "marker_block", "Copilot tips marker block"),
  ];

  for (const { label, pattern } of PROMO_PATTERNS) {
    all.push(...collectRegexMatches(text, pattern, "promo_phrase", label));
  }

  const matches = mergeOverlapping(all);
  const cleaned = stripRanges(text, matches);
  const removedChars = Math.max(0, text.length - cleaned.length);

  return {
    contaminated: matches.length > 0,
    matches,
    cleaned,
    removedChars,
  };
}

/** True if body looks contaminated (cheap check for scan loops). */
export function isContaminated(body: string | null | undefined): boolean {
  return detectAndClean(body).contaminated;
}

export const SAMPLE_CONTAMINATED_PR = `## Summary
Fixed the login redirect when session expires.

## Test plan
- [x] Log in
- [x] Wait for expiry
- [x] Confirm redirect

<!-- START COPILOT CODING AGENT TIPS -->
Quickly spin up Copilot coding agent tasks from anywhere on your macOS or Windows machine with Raycast.
https://www.raycast.com/

Start Copilot coding agent tasks from Slack
<!-- END COPILOT CODING AGENT TIPS -->
`;
