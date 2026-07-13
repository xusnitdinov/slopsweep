"use client";

import { useCallback, useEffect, useState } from "react";

type Repo = {
  id: number;
  fullName: string;
  private: boolean;
  htmlUrl: string;
};

type Hit = {
  repo: string;
  number: number;
  title: string;
  state: string;
  htmlUrl: string;
  body: string;
  cleaned: string;
  matches: { kind: string; label: string; excerpt: string }[];
  removedChars: number;
};

export function DashboardClient({
  userName,
  userLogin,
}: {
  userName?: string | null;
  userLogin?: string | null;
}) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hits, setHits] = useState<Hit[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [cleaningKey, setCleaningKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<Hit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [includeClosed, setIncludeClosed] = useState(true);

  const loadRepos = useCallback(async () => {
    setLoadingRepos(true);
    setError(null);
    try {
      const res = await fetch("/api/scan");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load repos");
      setRepos(data.repos);
      setSelected(new Set(data.repos.slice(0, 10).map((r: Repo) => r.fullName)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load repos");
    } finally {
      setLoadingRepos(false);
    }
  }, []);

  useEffect(() => {
    void loadRepos();
  }, [loadRepos]);

  function toggleRepo(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(repos.map((r) => r.fullName)));
  }

  function selectNone() {
    setSelected(new Set());
  }

  async function runScan() {
    if (selected.size === 0) {
      setError("Select at least one repository");
      return;
    }
    setScanning(true);
    setError(null);
    setStatus(null);
    setHits([]);
    setPreview(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repos: Array.from(selected),
          includeClosed,
          prsPerRepo: 30,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      setHits(data.hits);
      setStatus(
        data.hits.length === 0
          ? `Scanned ${data.scanned} repo(s) — no Copilot tip junk found.`
          : `Found ${data.hits.length} contaminated PR(s) across ${data.scanned} repo(s).`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  async function cleanHit(hit: Hit) {
    const key = `${hit.repo}#${hit.number}`;
    setCleaningKey(key);
    setError(null);
    try {
      const res = await fetch("/api/clean", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: hit.repo,
          number: hit.number,
          cleaned: hit.cleaned,
          dryRun: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Clean failed");
      setHits((prev) =>
        prev.filter((h) => !(h.repo === hit.repo && h.number === hit.number)),
      );
      if (preview?.repo === hit.repo && preview?.number === hit.number) {
        setPreview(null);
      }
      setStatus(`Cleaned ${hit.repo}#${hit.number}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Clean failed");
    } finally {
      setCleaningKey(null);
    }
  }

  async function cleanAll() {
    for (const hit of hits) {
      await cleanHit(hit);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-fog">
          Signed in as{" "}
          <span className="text-paper">{userLogin || userName || "you"}</span>.
          Scan is read-only — SlopSweep never deletes repos or touches code.
          Clean (optional) only edits a PR description after you confirm.
        </p>
      </div>

      {error && (
        <div className="rounded-sm border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}
      {status && (
        <div className="rounded-sm border border-acid/30 bg-acid/10 px-4 py-3 text-sm text-acid">
          {status}
        </div>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Repositories</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            <button
              type="button"
              onClick={selectAll}
              className="text-fog underline-offset-2 hover:text-paper hover:underline"
            >
              Select all
            </button>
            <span className="text-fog/40">·</span>
            <button
              type="button"
              onClick={selectNone}
              className="text-fog underline-offset-2 hover:text-paper hover:underline"
            >
              None
            </button>
            <span className="text-fog/40">·</span>
            <button
              type="button"
              onClick={() => void loadRepos()}
              className="text-fog underline-offset-2 hover:text-paper hover:underline"
            >
              Refresh
            </button>
          </div>
        </div>

        {loadingRepos ? (
          <p className="font-mono text-sm text-fog">Loading repos…</p>
        ) : repos.length === 0 ? (
          <p className="text-sm text-fog">No repositories found for this account.</p>
        ) : (
          <ul className="max-h-64 overflow-y-auto rounded-sm border border-line divide-y divide-line">
            {repos.map((repo) => (
              <li key={repo.id}>
                <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-ink-2">
                  <input
                    type="checkbox"
                    checked={selected.has(repo.fullName)}
                    onChange={() => toggleRepo(repo.fullName)}
                    className="accent-[var(--acid)]"
                  />
                  <span className="font-mono text-sm">{repo.fullName}</span>
                  {repo.private && (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-fog">
                      private
                    </span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-fog">
            <input
              type="checkbox"
              checked={includeClosed}
              onChange={(e) => setIncludeClosed(e.target.checked)}
              className="accent-[var(--acid)]"
            />
            Include closed PRs
          </label>
          <button
            type="button"
            onClick={() => void runScan()}
            disabled={scanning || selected.size === 0}
            className="rounded-sm bg-acid px-5 py-2.5 text-sm font-semibold text-ink disabled:opacity-50"
          >
            {scanning
              ? "Scanning…"
              : `Scan ${selected.size} repo${selected.size === 1 ? "" : "s"}`}
          </button>
        </div>
      </section>

      {hits.length > 0 && (
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Contaminated PRs</h2>
            <button
              type="button"
              onClick={() => void cleanAll()}
              className="rounded-sm border border-warn/50 px-4 py-2 text-sm text-warn hover:bg-warn/10"
            >
              Clean all ({hits.length})
            </button>
          </div>
          <ul className="space-y-3">
            {hits.map((hit) => {
              const key = `${hit.repo}#${hit.number}`;
              return (
                <li
                  key={key}
                  className="rounded-sm border border-line bg-ink-2 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <a
                        href={hit.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-paper hover:text-acid"
                      >
                        {hit.repo}#{hit.number}
                      </a>
                      <p className="mt-1 text-sm text-fog">{hit.title}</p>
                      <p className="mt-2 font-mono text-xs text-fog">
                        {hit.matches.map((m) => m.label).join(" · ")} · −
                        {hit.removedChars} chars · {hit.state}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPreview(preview?.number === hit.number && preview.repo === hit.repo ? null : hit)
                        }
                        className="rounded-sm border border-line px-3 py-1.5 text-sm text-fog hover:text-paper"
                      >
                        Diff
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            confirm(
                              `Clean ${hit.repo}#${hit.number}? This updates the PR description on GitHub.`,
                            )
                          ) {
                            void cleanHit(hit);
                          }
                        }}
                        disabled={cleaningKey === key}
                        className="rounded-sm bg-acid px-3 py-1.5 text-sm font-semibold text-ink disabled:opacity-50"
                      >
                        {cleaningKey === key ? "Cleaning…" : "Clean"}
                      </button>
                    </div>
                  </div>
                  {preview?.repo === hit.repo && preview?.number === hit.number && (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-danger">
                          Before
                        </p>
                        <pre className="max-h-56 overflow-auto rounded-sm border border-danger/20 bg-ink p-3 font-mono text-xs whitespace-pre-wrap">
                          {hit.body}
                        </pre>
                      </div>
                      <div>
                        <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-acid">
                          After
                        </p>
                        <pre className="max-h-56 overflow-auto rounded-sm border border-acid/20 bg-ink p-3 font-mono text-xs whitespace-pre-wrap">
                          {hit.cleaned}
                        </pre>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
