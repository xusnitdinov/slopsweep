"use client";

import { signOutAction } from "@/app/actions";
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

type Props = {
  login: string;
};

export function DashboardClient({ login }: Props) {
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
          : `Found ${data.hits.length} contaminated PR(s).`,
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted">
            Signed in as{" "}
            <span className="font-semibold text-ink">@{login}</span>. Scan is
            read-only. Clean only edits PR text after you confirm.
          </p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-sm text-muted hover:text-ink"
          >
            Sign out
          </button>
        </form>
      </div>

      {error && (
        <div className="rounded-xl border border-strike/30 bg-strike-soft px-4 py-3 text-sm text-strike">
          {error}
        </div>
      )}
      {status && (
        <div className="rounded-xl border border-ok/30 bg-ok-soft px-4 py-3 text-sm text-ok">
          {status}
        </div>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Repositories</h2>
          <div className="flex gap-3 text-sm text-muted">
            <button
              type="button"
              onClick={() => setSelected(new Set(repos.map((r) => r.fullName)))}
              className="hover:text-ink"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="hover:text-ink"
            >
              None
            </button>
            <button
              type="button"
              onClick={() => void loadRepos()}
              className="hover:text-ink"
            >
              Refresh
            </button>
          </div>
        </div>

        {loadingRepos ? (
          <p className="text-sm text-muted">Loading repos…</p>
        ) : (
          <ul className="max-h-64 overflow-y-auto rounded-xl border border-line bg-white divide-y divide-line">
            {repos.map((repo) => (
              <li key={repo.id}>
                <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-bg-2/50">
                  <input
                    type="checkbox"
                    checked={selected.has(repo.fullName)}
                    onChange={() => toggleRepo(repo.fullName)}
                    className="accent-[var(--accent)]"
                  />
                  <span className="font-mono text-sm">{repo.fullName}</span>
                  {repo.private && (
                    <span className="font-mono text-[10px] uppercase text-muted">
                      private
                    </span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={includeClosed}
              onChange={(e) => setIncludeClosed(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            Include closed PRs
          </label>
          <button
            type="button"
            onClick={() => void runScan()}
            disabled={scanning || selected.size === 0}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {scanning
              ? "Scanning…"
              : `Scan ${selected.size} repo${selected.size === 1 ? "" : "s"}`}
          </button>
        </div>
      </section>

      {hits.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">Contaminated PRs</h2>
          <ul className="space-y-3">
            {hits.map((hit) => {
              const key = `${hit.repo}#${hit.number}`;
              return (
                <li
                  key={key}
                  className="rounded-xl border border-line bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <a
                        href={hit.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-ink hover:text-accent"
                      >
                        {hit.repo}#{hit.number}
                      </a>
                      <p className="mt-1 text-sm text-muted">{hit.title}</p>
                      <p className="mt-2 font-mono text-xs text-muted">
                        {hit.matches.map((m) => m.label).join(" · ")} · −
                        {hit.removedChars} chars
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPreview(
                            preview?.number === hit.number &&
                              preview.repo === hit.repo
                              ? null
                              : hit,
                          )
                        }
                        className="rounded-full border border-line px-3 py-1.5 text-sm text-muted hover:text-ink"
                      >
                        Diff
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            confirm(
                              `Clean ${hit.repo}#${hit.number}? Only the PR description text will change.`,
                            )
                          ) {
                            void cleanHit(hit);
                          }
                        }}
                        disabled={cleaningKey === key}
                        className="rounded-full bg-ink px-3 py-1.5 text-sm font-semibold text-bg disabled:opacity-50"
                      >
                        {cleaningKey === key ? "Cleaning…" : "Clean"}
                      </button>
                    </div>
                  </div>
                  {preview?.repo === hit.repo &&
                    preview?.number === hit.number && (
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-strike">
                            Before
                          </p>
                          <pre className="max-h-56 overflow-auto rounded-lg border border-strike/20 bg-strike-soft/40 p-3 font-mono text-xs whitespace-pre-wrap">
                            {hit.body}
                          </pre>
                        </div>
                        <div>
                          <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-ok">
                            After
                          </p>
                          <pre className="max-h-56 overflow-auto rounded-lg border border-ok/20 bg-ok-soft/50 p-3 font-mono text-xs whitespace-pre-wrap">
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
