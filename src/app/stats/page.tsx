"use client";

import { SiteHeader } from "@/components/SiteHeader";
import {
  defaultStats,
  loadHistory,
  loadStats,
  type CleanHistoryEntry,
  type SweepStats,
} from "@/lib/client-store";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function StatsPage() {
  const [stats, setStats] = useState<SweepStats>(defaultStats());
  const [history, setHistory] = useState<CleanHistoryEntry[]>([]);

  useEffect(() => {
    setStats(loadStats());
    setHistory(loadHistory());
  }, []);

  return (
    <div className="min-h-screen bg-surface/30 text-ink">
      <SiteHeader active="stats" />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Your stats</h1>
        <p className="mt-2 text-sm text-muted">
          Stored in this browser — great for portfolio screenshots after a
          cleanup session.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "PRs cleaned", value: stats.prsCleaned },
            { label: "READMEs cleaned", value: stats.readmesCleaned },
            { label: "READMEs created", value: stats.readmesCreated },
            {
              label: "Characters removed",
              value: stats.charsRemoved.toLocaleString(),
            },
            { label: "Scans run", value: stats.scansRun },
            {
              label: "Last scan",
              value: stats.lastScanAt
                ? new Date(stats.lastScanAt).toLocaleString()
                : "—",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-line bg-white px-4 py-3"
            >
              <p className="text-xs text-muted">{s.label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>

        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent cleans</h2>
            <Link
              href="/dashboard"
              className="text-sm text-muted hover:text-ink"
            >
              Open dashboard
            </Link>
          </div>
          {history.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line bg-white px-4 py-8 text-center text-sm text-muted">
              No cleans yet. Run a scan and clean something to fill this list.
            </p>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line bg-white">
              {history.slice(0, 20).map((h) => (
                <li
                  key={h.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {h.kind === "pr"
                        ? `${h.repo}#${h.number}`
                        : `${h.repo}/${h.path ?? "README.md"}`}
                      {h.undone ? (
                        <span className="ml-2 text-xs text-muted">(undone)</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(h.at).toLocaleString()}
                    </p>
                  </div>
                  {h.htmlUrl && (
                    <a
                      href={h.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-muted hover:text-ink"
                    >
                      View ↗
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
