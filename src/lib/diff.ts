/** Simple line-based diff for before/after previews. */

export type DiffLine = {
  type: "same" | "add" | "del";
  text: string;
  oldLine?: number;
  newLine?: number;
};

export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const n = a.length;
  const m = b.length;

  // LCS DP — fine for PR bodies (usually small)
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] =
        a[i] === b[j]
          ? (dp[i + 1]![j + 1] ?? 0) + 1
          : Math.max(dp[i + 1]![j] ?? 0, dp[i]![j + 1] ?? 0);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  let oldLine = 1;
  let newLine = 1;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: "same", text: a[i]!, oldLine, newLine });
      i++;
      j++;
      oldLine++;
      newLine++;
    } else if ((dp[i + 1]![j] ?? 0) >= (dp[i]![j + 1] ?? 0)) {
      out.push({ type: "del", text: a[i]!, oldLine });
      i++;
      oldLine++;
    } else {
      out.push({ type: "add", text: b[j]!, newLine });
      j++;
      newLine++;
    }
  }
  while (i < n) {
    out.push({ type: "del", text: a[i]!, oldLine });
    i++;
    oldLine++;
  }
  while (j < m) {
    out.push({ type: "add", text: b[j]!, newLine });
    j++;
    newLine++;
  }
  return out;
}
