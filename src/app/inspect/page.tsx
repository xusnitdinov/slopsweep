"use client";

import { LineDiff } from "@/components/LineDiff";
import { SiteHeader } from "@/components/SiteHeader";
import Link from "next/link";
import { useState } from "react";

type Result = {
  repo: string;
  number: number;
  title: string;
  state: string;
  htmlUrl: string;
  body: string;
  cleaned: string;
  contaminated: boolean;
  matches: { kind: string; label: string; excerpt: string }[];
  removedChars: number;
};

export default function InspectPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/public-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface/30 text-ink">
      <SiteHeader active="inspect" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          Inspect a public PR
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          No login. Paste any public GitHub pull request URL to detect Copilot
          tip residue. Cleaning still requires the dashboard.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo/pull/123"
            className="flex-1 rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-ink/30"
          />
          <button
            type="button"
            onClick={() => void run()}
            disabled={loading || !url.trim()}
            className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 hover:bg-accent-hover"
          >
            {loading ? "Scanning…" : "Scan PR"}
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-md border border-strike/20 bg-strike-soft px-4 py-3 text-sm text-strike">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-8 space-y-4 rounded-lg border border-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <a
                  href={result.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium hover:underline"
                >
                  {result.repo}#{result.number}
                </a>
                <p className="mt-1 text-sm text-muted">{result.title}</p>
              </div>
              <span
                className={`rounded-md px-2 py-1 text-xs font-medium ${
                  result.contaminated
                    ? "bg-strike-soft text-strike"
                    : "bg-ok-soft text-ok"
                }`}
              >
                {result.contaminated
                  ? `${result.matches.length} tip match(es) · −${result.removedChars} chars`
                  : "Clean"}
              </span>
            </div>

            {result.contaminated && (
              <>
                <ul className="text-xs text-muted">
                  {result.matches.map((m, i) => (
                    <li key={`${m.label}-${i}`}>
                      {m.label} · {m.kind}
                    </li>
                  ))}
                </ul>
                <LineDiff before={result.body} after={result.cleaned} />
                <p className="text-sm text-muted">
                  Want to clean it on GitHub?{" "}
                  <Link
                    href="/dashboard"
                    className="text-ink underline underline-offset-2"
                  >
                    Sign in on the dashboard
                  </Link>
                  .
                </p>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
