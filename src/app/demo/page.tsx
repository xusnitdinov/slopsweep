"use client";

import {
  SAMPLE_CONTAMINATED_PR,
  detectAndClean,
} from "@/lib/detectors";
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

  function runDetect() {
    const data = detectAndClean(text);
    setResult({
      contaminated: data.contaminated,
      matches: data.matches.map((m) => ({
        kind: m.kind,
        label: m.label,
        excerpt: m.excerpt,
      })),
      cleaned: data.cleaned,
      removedChars: data.removedChars,
    });
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-7">
        <Link href="/" className="text-[15px] font-extrabold tracking-tight">
          SlopSweep
        </Link>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-muted hover:text-ink"
        >
          Open app →
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-16">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Paste demo
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          No login. Drop a PR description and see what gets stripped — runs in
          your browser.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-wider text-muted">
              PR body
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={18}
              className="w-full resize-y rounded-xl border border-line bg-white p-4 font-mono text-sm leading-relaxed text-ink outline-none focus:border-accent"
            />
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={runDetect}
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white"
              >
                Detect &amp; clean
              </button>
              <button
                type="button"
                onClick={() => {
                  setText(SAMPLE_CONTAMINATED_PR);
                  setResult(null);
                }}
                className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-muted hover:text-ink"
              >
                Reset sample
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-wider text-muted">
              Result
            </label>
            {!result ? (
              <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-line bg-bg-2/60 p-6 text-sm text-muted">
                Run detection to preview the cleaned body.
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    result.contaminated
                      ? "border-strike/30 bg-strike-soft text-strike"
                      : "border-ok/30 bg-ok-soft text-ok"
                  }`}
                >
                  {result.contaminated
                    ? `Found ${result.matches.length} tip block(s) · ${result.removedChars} chars removed`
                    : "Clean — no Copilot tip patterns found"}
                </div>
                {result.matches.length > 0 && (
                  <ul className="space-y-2">
                    {result.matches.map((m, i) => (
                      <li
                        key={`${m.label}-${i}`}
                        className="rounded-xl border border-line bg-white p-3 font-mono text-xs"
                      >
                        <span className="font-medium text-accent">{m.label}</span>
                        <span className="text-muted"> · {m.kind}</span>
                        <pre className="mt-2 whitespace-pre-wrap text-muted">
                          {m.excerpt}
                        </pre>
                      </li>
                    ))}
                  </ul>
                )}
                <pre className="overflow-auto rounded-xl border border-line bg-white p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
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
