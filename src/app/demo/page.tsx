"use client";

import {
  SAMPLE_CONTAMINATED_PR,
  detectAndClean,
} from "@/lib/detectors";
import { SiteHeader } from "@/components/SiteHeader";
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
      <SiteHeader active="demo" />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight">Paste demo</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Paste a PR description to see what SlopSweep would remove. Runs
            locally in your browser — no data is sent anywhere.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-ink">
              Input
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={18}
              className="w-full resize-y rounded-md border border-line bg-white p-4 font-mono text-sm leading-relaxed text-ink outline-none focus:border-ink/30 focus:ring-2 focus:ring-ink/5"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={runDetect}
                className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
              >
                Detect and clean
              </button>
              <button
                type="button"
                onClick={() => {
                  setText(SAMPLE_CONTAMINATED_PR);
                  setResult(null);
                }}
                className="rounded-md border border-line px-4 py-2 text-sm font-medium text-muted hover:text-ink"
              >
                Reset sample
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-ink">
              Output
            </label>
            {!result ? (
              <div className="flex min-h-64 items-center justify-center rounded-md border border-dashed border-line bg-surface/50 p-6 text-sm text-muted">
                Run detection to preview the cleaned body.
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  className={`rounded-md border px-4 py-3 text-sm ${
                    result.contaminated
                      ? "border-strike/20 bg-strike-soft text-strike"
                      : "border-ok/20 bg-ok-soft text-ok"
                  }`}
                >
                  {result.contaminated
                    ? `${result.matches.length} match(es) · ${result.removedChars} characters removed`
                    : "No Copilot tip patterns found"}
                </div>
                {result.matches.length > 0 && (
                  <ul className="space-y-2">
                    {result.matches.map((m, i) => (
                      <li
                        key={`${m.label}-${i}`}
                        className="rounded-md border border-line bg-white p-3 font-mono text-xs"
                      >
                        <span className="font-medium text-ink">{m.label}</span>
                        <span className="text-muted"> · {m.kind}</span>
                        <pre className="mt-2 whitespace-pre-wrap text-muted">
                          {m.excerpt}
                        </pre>
                      </li>
                    ))}
                  </ul>
                )}
                <pre className="overflow-auto rounded-md border border-line bg-white p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                  {result.cleaned || "(empty after clean)"}
                </pre>
              </div>
            )}
          </div>
        </div>

        <p className="mt-10 text-sm text-muted">
          Want to scan your repos?{" "}
          <Link
            href="/dashboard"
            className="text-ink underline underline-offset-2"
          >
            Sign in with GitHub
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
