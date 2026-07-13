"use client";

import { SAMPLE_CONTAMINATED_PR } from "@/lib/detectors";
import Link from "next/link";
import { useState } from "react";

type DemoResult = {
  contaminated: boolean;
  matches: { kind: string; label: string; excerpt: string }[];
  cleaned: string;
  removedChars: number;
};

export default function DemoPage() {
  const [text, setText] = useState(SAMPLE_CONTAMINATED_PR);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function runDetect() {
    setLoading(true);
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-semibold text-acid">
          SlopSweep
        </Link>
        <Link href="/dashboard" className="text-sm text-fog hover:text-paper">
          Dashboard →
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-16">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Paste demo
        </h1>
        <p className="mt-2 max-w-2xl text-fog">
          No GitHub login needed. Drop a PR description and see what gets
          stripped.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <label className="mb-2 block font-mono text-xs uppercase tracking-wider text-fog">
              PR body
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={18}
              className="w-full resize-y rounded-sm border border-line bg-ink-2 p-4 font-mono text-sm leading-relaxed text-paper outline-none focus:border-acid/50"
            />
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={runDetect}
                disabled={loading}
                className="rounded-sm bg-acid px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
              >
                {loading ? "Scanning…" : "Detect & clean"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setText(SAMPLE_CONTAMINATED_PR);
                  setResult(null);
                }}
                className="rounded-sm border border-line px-4 py-2 text-sm text-fog hover:text-paper"
              >
                Reset sample
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block font-mono text-xs uppercase tracking-wider text-fog">
              Result
            </label>
            {!result ? (
              <div className="flex h-full min-h-64 items-center justify-center rounded-sm border border-dashed border-line bg-ink-2/50 p-6 text-sm text-fog">
                Run detection to preview the cleaned body.
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  className={`rounded-sm border px-4 py-3 text-sm ${
                    result.contaminated
                      ? "border-warn/40 bg-warn/10 text-warn"
                      : "border-acid/30 bg-acid/10 text-acid"
                  }`}
                >
                  {result.contaminated
                    ? `Contaminated — ${result.matches.length} match(es), ${result.removedChars} chars removed`
                    : "Clean — no Copilot tip patterns found"}
                </div>
                {result.matches.length > 0 && (
                  <ul className="space-y-2">
                    {result.matches.map((m, i) => (
                      <li
                        key={`${m.label}-${i}`}
                        className="rounded-sm border border-line bg-ink-2 p-3 font-mono text-xs"
                      >
                        <span className="text-acid">{m.label}</span>
                        <span className="text-fog"> · {m.kind}</span>
                        <pre className="mt-2 whitespace-pre-wrap text-fog/90">
                          {m.excerpt}
                        </pre>
                      </li>
                    ))}
                  </ul>
                )}
                <pre className="overflow-auto rounded-sm border border-line bg-ink-2 p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                  {result.cleaned || "(empty after clean)"}
                </pre>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
