"use client";

import { changeAccountAction, signOutAction } from "@/app/actions";
import { useCallback, useEffect, useMemo, useState } from "react";

type Repo = {
  id: number;
  fullName: string;
  private: boolean;
  htmlUrl: string;
  updatedAt: string;
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

type ReadmeResult = {
  repo: string;
  path: string | null;
  sha: string | null;
  htmlUrl: string;
  content: string;
  cleaned: string;
  tipContaminated: boolean;
  matches: { kind: string; label: string; excerpt: string }[];
  removedChars: number;
  issues: { id: string; severity: string; label: string; detail: string }[];
  score: number;
};

type ScanSummary = {
  reposScanned: number;
  prsScanned: number;
  reposWithHits: number;
  hitCount: number;
  charsRemovable: number;
  at: string;
};

type Props = {
  login: string;
  avatarUrl?: string | null;
};

type VisibilityFilter = "all" | "public" | "private";
type StateFilter = "all" | "open" | "closed";
type Tab = "prs" | "readmes";

function formatRelative(dateStr: string) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1mo ago" : `${months}mo ago`;
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-white px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function scoreColor(score: number) {
  if (score >= 80) return "text-ok";
  if (score >= 50) return "text-amber-600";
  return "text-strike";
}

export function DashboardClient({ login, avatarUrl }: Props) {
  const [tab, setTab] = useState<Tab>("prs");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hits, setHits] = useState<Hit[]>([]);
  const [readmeResults, setReadmeResults] = useState<ReadmeResult[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanningReadmes, setScanningReadmes] = useState(false);
  const [bulkCleaning, setBulkCleaning] = useState(false);
  const [cleaningKey, setCleaningKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<Hit | null>(null);
  const [readmePreview, setReadmePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [includeClosed, setIncludeClosed] = useState(true);
  const [prsPerRepo, setPrsPerRepo] = useState(30);
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");
  const [lastScan, setLastScan] = useState<ScanSummary | null>(null);
  const [onlyIssues, setOnlyIssues] = useState(true);

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

  const filteredRepos = useMemo(() => {
    const q = search.trim().toLowerCase();
    return repos.filter((repo) => {
      if (visibility === "public" && repo.private) return false;
      if (visibility === "private" && !repo.private) return false;
      if (q && !repo.fullName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [repos, search, visibility]);

  const filteredHits = useMemo(() => {
    if (stateFilter === "all") return hits;
    return hits.filter((h) => h.state === stateFilter);
  }, [hits, stateFilter]);

  const hitsByRepo = useMemo(() => {
    const map = new Map<string, Hit[]>();
    for (const hit of filteredHits) {
      const list = map.get(hit.repo) ?? [];
      list.push(hit);
      map.set(hit.repo, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filteredHits]);

  const visibleReadmes = useMemo(() => {
    const list = onlyIssues
      ? readmeResults.filter((r) => r.issues.length > 0)
      : readmeResults;
    return [...list].sort((a, b) => a.score - b.score);
  }, [readmeResults, onlyIssues]);

  const totalChars = useMemo(
    () => hits.reduce((sum, h) => sum + h.removedChars, 0),
    [hits],
  );

  const avgReadmeScore = useMemo(() => {
    if (readmeResults.length === 0) return null;
    const sum = readmeResults.reduce((s, r) => s + r.score, 0);
    return Math.round(sum / readmeResults.length);
  }, [readmeResults]);

  function toggleRepo(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function selectVisible() {
    setSelected(new Set(filteredRepos.map((r) => r.fullName)));
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
          prsPerRepo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      setHits(data.hits);
      setLastScan({
        reposScanned: data.scanned,
        prsScanned: data.prsScanned,
        reposWithHits: data.reposWithHits,
        hitCount: data.hits.length,
        charsRemovable: data.hits.reduce(
          (sum: number, h: Hit) => sum + h.removedChars,
          0,
        ),
        at: new Date().toISOString(),
      });
      setTab("prs");
      setStatus(
        data.hits.length === 0
          ? `Scanned ${data.prsScanned} PRs across ${data.scanned} repos — all clean.`
          : `Found ${data.hits.length} contaminated PR${data.hits.length === 1 ? "" : "s"} in ${data.reposWithHits} repo${data.reposWithHits === 1 ? "" : "s"}.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  async function runReadmeScan() {
    if (selected.size === 0) {
      setError("Select at least one repository");
      return;
    }
    setScanningReadmes(true);
    setError(null);
    setStatus(null);
    setReadmeResults([]);
    setReadmePreview(null);
    try {
      const res = await fetch("/api/readme/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repos: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "README scan failed");
      setReadmeResults(data.results);
      setTab("readmes");
      setStatus(
        `Checked ${data.scanned} README(s) — ${data.withIssues} with issues, ${data.withTips} with Copilot tips.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "README scan failed");
    } finally {
      setScanningReadmes(false);
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

  async function cleanReadmeTips(item: ReadmeResult) {
    if (!item.tipContaminated) return;
    if (
      !confirm(
        `Update ${item.repo}/${item.path}? Only Copilot tip text will be removed from the README.`,
      )
    ) {
      return;
    }
    setCleaningKey(`readme:${item.repo}`);
    setError(null);
    try {
      const res = await fetch("/api/readme/clean", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: item.repo,
          cleaned: item.cleaned,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "README clean failed");
      setReadmeResults((prev) =>
        prev.map((r) =>
          r.repo === item.repo
            ? {
                ...r,
                content: item.cleaned,
                tipContaminated: false,
                matches: [],
                removedChars: 0,
                issues: r.issues.filter((i) => i.id !== "copilot-tips"),
                score: Math.min(100, r.score + 25),
              }
            : r,
        ),
      );
      setStatus(`Cleaned README tips in ${item.repo}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "README clean failed");
    } finally {
      setCleaningKey(null);
    }
  }

  async function cleanAll() {
    if (filteredHits.length === 0) return;
    if (
      !confirm(
        `Clean ${filteredHits.length} PR${filteredHits.length === 1 ? "" : "s"}? Only descriptions will change.`,
      )
    ) {
      return;
    }
    setBulkCleaning(true);
    setError(null);
    let cleaned = 0;
    const total = filteredHits.length;
    for (const hit of [...filteredHits]) {
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
          prev.filter(
            (h) => !(h.repo === hit.repo && h.number === hit.number),
          ),
        );
        cleaned++;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Bulk clean stopped");
        break;
      }
    }
    setPreview(null);
    setStatus(`Cleaned ${cleaned} of ${total} PR(s)`);
    setBulkCleaning(false);
  }

  function exportReport() {
    const payload = {
      scannedAt: new Date().toISOString(),
      user: login,
      prScan: lastScan,
      prHits: hits.map((h) => ({
        repo: h.repo,
        number: h.number,
        title: h.title,
        state: h.state,
        url: h.htmlUrl,
        matches: h.matches.map((m) => m.label),
        removedChars: h.removedChars,
      })),
      readmes: readmeResults.map((r) => ({
        repo: r.repo,
        path: r.path,
        score: r.score,
        tipContaminated: r.tipContaminated,
        issues: r.issues,
        url: r.htmlUrl,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `slopsweep-report-${login}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyCleaned(text: string) {
    void navigator.clipboard.writeText(text);
    setStatus("Copied cleaned text to clipboard");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-10 w-10 rounded-full border border-line"
            />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-sm font-semibold">
              {login.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div>
            <p className="font-medium">@{login}</p>
            <p className="text-xs text-muted">
              {repos.length} repos · scan is read-only until you clean
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action={changeAccountAction}>
            <button
              type="submit"
              className="rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:text-ink"
            >
              Change account
            </button>
          </form>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Repositories" value={repos.length} />
        <StatCard
          label="Selected"
          value={selected.size}
          hint={`${filteredRepos.length} visible`}
        />
        <StatCard
          label="PR issues"
          value={hits.length}
          hint={
            lastScan
              ? `${lastScan.prsScanned} PRs scanned`
              : "Run a PR scan"
          }
        />
        <StatCard
          label="README score"
          value={avgReadmeScore ?? "—"}
          hint={
            readmeResults.length
              ? `avg across ${readmeResults.length}`
              : "Run a README scan"
          }
        />
      </div>

      {error && (
        <div className="rounded-lg border border-strike/20 bg-strike-soft px-4 py-3 text-sm text-strike">
          {error}
        </div>
      )}
      {status && (
        <div className="rounded-lg border border-ok/20 bg-ok-soft px-4 py-3 text-sm text-ok">
          {status}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-lg border border-line bg-white p-4">
            <h2 className="font-semibold">Actions</h2>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-xs text-muted">PRs per repository</span>
                <select
                  value={prsPerRepo}
                  onChange={(e) => setPrsPerRepo(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink/30"
                >
                  <option value={10}>10 most recent</option>
                  <option value={30}>30 most recent</option>
                  <option value={50}>50 most recent</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeClosed}
                  onChange={(e) => setIncludeClosed(e.target.checked)}
                  className="accent-ink"
                />
                Include closed pull requests
              </label>
              <button
                type="button"
                onClick={() => void runScan()}
                disabled={scanning || selected.size === 0}
                className="w-full rounded-md bg-ink py-2.5 text-sm font-medium text-white disabled:opacity-50 hover:bg-accent-hover"
              >
                {scanning
                  ? "Scanning PRs…"
                  : `Scan PRs (${selected.size})`}
              </button>
              <button
                type="button"
                onClick={() => void runReadmeScan()}
                disabled={scanningReadmes || selected.size === 0}
                className="w-full rounded-md border border-line py-2.5 text-sm font-medium text-ink hover:bg-surface disabled:opacity-50"
              >
                {scanningReadmes
                  ? "Checking READMEs…"
                  : `Check READMEs (${selected.size})`}
              </button>
              <button
                type="button"
                onClick={exportReport}
                disabled={hits.length === 0 && readmeResults.length === 0}
                className="w-full rounded-md border border-line py-2 text-sm text-muted hover:text-ink disabled:opacity-40"
              >
                Export JSON report
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">Repositories</h2>
              <button
                type="button"
                onClick={() => void loadRepos()}
                className="text-xs text-muted hover:text-ink"
              >
                Refresh
              </button>
            </div>

            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search repos…"
              className="mt-3 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-ink/30"
            />

            <div className="mt-3 flex gap-1">
              {(["all", "public", "private"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={`rounded-md px-2.5 py-1 text-xs capitalize ${
                    visibility === v
                      ? "bg-ink text-white"
                      : "bg-surface text-muted hover:text-ink"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <div className="mt-3 flex gap-3 text-xs text-muted">
              <button type="button" onClick={selectVisible} className="hover:text-ink">
                Select visible
              </button>
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
                Clear
              </button>
            </div>

            {loadingRepos ? (
              <p className="mt-4 text-sm text-muted">Loading repositories…</p>
            ) : filteredRepos.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No repositories match.</p>
            ) : (
              <ul className="mt-3 max-h-80 overflow-y-auto rounded-md border border-line divide-y divide-line">
                {filteredRepos.map((repo) => (
                  <li key={repo.id}>
                    <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-surface/80">
                      <input
                        type="checkbox"
                        checked={selected.has(repo.fullName)}
                        onChange={() => toggleRepo(repo.fullName)}
                        className="mt-0.5 accent-ink"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-sm">
                          {repo.fullName}
                        </span>
                        <span className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                          {repo.private ? "Private" : "Public"}
                          {repo.updatedAt && (
                            <>
                              <span>·</span>
                              <span>Updated {formatRelative(repo.updatedAt)}</span>
                            </>
                          )}
                        </span>
                      </span>
                      <a
                        href={repo.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-xs text-muted hover:text-ink"
                        onClick={(e) => e.stopPropagation()}
                      >
                        ↗
                      </a>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="rounded-lg border border-line bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setTab("prs")}
                  className={`rounded-md px-3 py-1.5 text-sm ${
                    tab === "prs"
                      ? "bg-ink text-white"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  Pull requests
                  {hits.length > 0 && (
                    <span className="ml-1.5 opacity-70">{hits.length}</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setTab("readmes")}
                  className={`rounded-md px-3 py-1.5 text-sm ${
                    tab === "readmes"
                      ? "bg-ink text-white"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  READMEs
                  {readmeResults.length > 0 && (
                    <span className="ml-1.5 opacity-70">
                      {readmeResults.length}
                    </span>
                  )}
                </button>
              </div>
              {tab === "prs" && hits.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex gap-1">
                    {(["all", "open", "closed"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStateFilter(s)}
                        className={`rounded-md px-2.5 py-1 text-xs capitalize ${
                          stateFilter === s
                            ? "bg-surface text-ink"
                            : "text-muted hover:text-ink"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => void cleanAll()}
                    disabled={bulkCleaning || filteredHits.length === 0}
                    className="rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 hover:bg-accent-hover"
                  >
                    {bulkCleaning
                      ? "Cleaning…"
                      : `Clean all (${filteredHits.length})`}
                  </button>
                </div>
              )}
              {tab === "readmes" && readmeResults.length > 0 && (
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={onlyIssues}
                    onChange={(e) => setOnlyIssues(e.target.checked)}
                    className="accent-ink"
                  />
                  Only with issues
                </label>
              )}
            </div>

            <div className="p-4">
              {tab === "prs" && (
                <>
                  {!lastScan ? (
                    <div className="flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-line bg-surface/30 px-6 py-12 text-center">
                      <p className="font-medium">No PR scan yet</p>
                      <p className="mt-1 max-w-sm text-sm text-muted">
                        Select repositories, then scan pull requests for Copilot
                        tip residue.
                      </p>
                    </div>
                  ) : filteredHits.length === 0 ? (
                    <div className="flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-line bg-ok-soft/30 px-6 py-12 text-center">
                      <p className="font-medium text-ok">All clear</p>
                      <p className="mt-1 max-w-sm text-sm text-muted">
                        Scanned {lastScan.prsScanned} PRs — no tip patterns
                        found.
                        {totalChars > 0 ? "" : ""}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {hitsByRepo.map(([repoName, repoHits]) => (
                        <div key={repoName}>
                          <div className="mb-2 flex items-center justify-between">
                            <h3 className="font-mono text-sm font-medium">
                              {repoName}
                            </h3>
                            <span className="text-xs text-muted">
                              {repoHits.length} PR
                              {repoHits.length === 1 ? "" : "s"}
                            </span>
                          </div>
                          <ul className="space-y-2">
                            {repoHits.map((hit) => {
                              const key = `${hit.repo}#${hit.number}`;
                              const isOpen =
                                preview?.repo === hit.repo &&
                                preview?.number === hit.number;
                              return (
                                <li
                                  key={key}
                                  className="rounded-md border border-line bg-surface/20 p-4"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <a
                                          href={hit.htmlUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="font-medium hover:underline"
                                        >
                                          #{hit.number}
                                        </a>
                                        <span
                                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                                            hit.state === "open"
                                              ? "bg-ok-soft text-ok"
                                              : "bg-surface text-muted"
                                          }`}
                                        >
                                          {hit.state}
                                        </span>
                                      </div>
                                      <p className="mt-1 truncate text-sm text-muted">
                                        {hit.title}
                                      </p>
                                      <p className="mt-2 text-xs text-muted">
                                        {hit.matches
                                          .map((m) => m.label)
                                          .join(" · ")}
                                        {" · "}
                                        {hit.removedChars} chars
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPreview(isOpen ? null : hit)
                                        }
                                        className="rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:text-ink"
                                      >
                                        {isOpen ? "Hide" : "Preview"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => copyCleaned(hit.cleaned)}
                                        className="rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:text-ink"
                                      >
                                        Copy clean
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (
                                            confirm(
                                              `Clean ${hit.repo}#${hit.number}? Only the PR description will change.`,
                                            )
                                          ) {
                                            void cleanHit(hit);
                                          }
                                        }}
                                        disabled={
                                          cleaningKey === key || bulkCleaning
                                        }
                                        className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 hover:bg-accent-hover"
                                      >
                                        {cleaningKey === key
                                          ? "Cleaning…"
                                          : "Clean"}
                                      </button>
                                    </div>
                                  </div>
                                  {isOpen && (
                                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                                      <div>
                                        <p className="mb-1 text-xs font-medium text-strike">
                                          Before
                                        </p>
                                        <pre className="max-h-48 overflow-auto rounded-md border border-strike/20 bg-strike-soft/40 p-3 font-mono text-xs whitespace-pre-wrap">
                                          {hit.body}
                                        </pre>
                                      </div>
                                      <div>
                                        <p className="mb-1 text-xs font-medium text-ok">
                                          After
                                        </p>
                                        <pre className="max-h-48 overflow-auto rounded-md border border-ok/20 bg-ok-soft/50 p-3 font-mono text-xs whitespace-pre-wrap">
                                          {hit.cleaned}
                                        </pre>
                                      </div>
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {tab === "readmes" && (
                <>
                  {readmeResults.length === 0 ? (
                    <div className="flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-line bg-surface/30 px-6 py-12 text-center">
                      <p className="font-medium">No README scan yet</p>
                      <p className="mt-1 max-w-sm text-sm text-muted">
                        Check READMEs for missing files, tip residue, TODOs, and
                        thin docs. Tip residue can be cleaned with a confirm.
                      </p>
                    </div>
                  ) : visibleReadmes.length === 0 ? (
                    <div className="flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-line bg-ok-soft/30 px-6 py-12 text-center">
                      <p className="font-medium text-ok">Looking good</p>
                      <p className="mt-1 max-w-sm text-sm text-muted">
                        No README issues in the current filter.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {visibleReadmes.map((item) => {
                        const open = readmePreview === item.repo;
                        return (
                          <li
                            key={item.repo}
                            className="rounded-md border border-line bg-surface/20 p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <a
                                    href={item.htmlUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-mono text-sm font-medium hover:underline"
                                  >
                                    {item.repo}
                                  </a>
                                  <span
                                    className={`text-sm font-semibold tabular-nums ${scoreColor(item.score)}`}
                                  >
                                    {item.score}/100
                                  </span>
                                  {item.path && (
                                    <span className="text-xs text-muted">
                                      {item.path}
                                    </span>
                                  )}
                                </div>
                                <ul className="mt-2 space-y-1">
                                  {item.issues.map((issue) => (
                                    <li
                                      key={issue.id}
                                      className="text-xs text-muted"
                                    >
                                      <span
                                        className={
                                          issue.severity === "error"
                                            ? "text-strike"
                                            : issue.severity === "warn"
                                              ? "text-amber-600"
                                              : "text-muted"
                                        }
                                      >
                                        {issue.label}
                                      </span>
                                      {" — "}
                                      {issue.detail}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {item.content && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReadmePreview(open ? null : item.repo)
                                    }
                                    className="rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:text-ink"
                                  >
                                    {open ? "Hide" : "View"}
                                  </button>
                                )}
                                {item.tipContaminated && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        copyCleaned(item.cleaned)
                                      }
                                      className="rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:text-ink"
                                    >
                                      Copy clean
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void cleanReadmeTips(item)
                                      }
                                      disabled={
                                        cleaningKey === `readme:${item.repo}`
                                      }
                                      className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                                    >
                                      {cleaningKey === `readme:${item.repo}`
                                        ? "Cleaning…"
                                        : "Clean tips"}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            {open && (
                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <div>
                                  <p className="mb-1 text-xs font-medium text-muted">
                                    Current
                                  </p>
                                  <pre className="max-h-56 overflow-auto rounded-md border border-line bg-white p-3 font-mono text-xs whitespace-pre-wrap">
                                    {item.content || "(empty)"}
                                  </pre>
                                </div>
                                <div>
                                  <p className="mb-1 text-xs font-medium text-ok">
                                    After tip clean
                                  </p>
                                  <pre className="max-h-56 overflow-auto rounded-md border border-ok/20 bg-ok-soft/40 p-3 font-mono text-xs whitespace-pre-wrap">
                                    {item.cleaned || "(empty)"}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
