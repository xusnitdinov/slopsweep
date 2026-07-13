"use client";

export type CleanHistoryEntry = {
  id: string;
  kind: "pr" | "readme";
  repo: string;
  number?: number;
  path?: string;
  before: string;
  after: string;
  htmlUrl?: string;
  at: string;
  undone?: boolean;
};

export type SweepStats = {
  prsCleaned: number;
  readmesCleaned: number;
  readmesCreated: number;
  charsRemoved: number;
  scansRun: number;
  lastScanAt: string | null;
};

const HISTORY_KEY = "slopsweep_history_v1";
const STATS_KEY = "slopsweep_stats_v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadHistory(): CleanHistoryEntry[] {
  if (typeof window === "undefined") return [];
  return safeParse<CleanHistoryEntry[]>(localStorage.getItem(HISTORY_KEY), []);
}

export function pushHistory(entry: Omit<CleanHistoryEntry, "id" | "at">) {
  const list = loadHistory();
  const full: CleanHistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
  };
  const next = [full, ...list].slice(0, 50);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return full;
}

export function markHistoryUndone(id: string) {
  const list = loadHistory().map((e) =>
    e.id === id ? { ...e, undone: true } : e,
  );
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

export function defaultStats(): SweepStats {
  return {
    prsCleaned: 0,
    readmesCleaned: 0,
    readmesCreated: 0,
    charsRemoved: 0,
    scansRun: 0,
    lastScanAt: null,
  };
}

export function loadStats(): SweepStats {
  if (typeof window === "undefined") return defaultStats();
  return { ...defaultStats(), ...safeParse(localStorage.getItem(STATS_KEY), {}) };
}

export function bumpStats(patch: Partial<SweepStats>) {
  const cur = loadStats();
  const next: SweepStats = {
    prsCleaned: cur.prsCleaned + (patch.prsCleaned ?? 0),
    readmesCleaned: cur.readmesCleaned + (patch.readmesCleaned ?? 0),
    readmesCreated: cur.readmesCreated + (patch.readmesCreated ?? 0),
    charsRemoved: cur.charsRemoved + (patch.charsRemoved ?? 0),
    scansRun: cur.scansRun + (patch.scansRun ?? 0),
    lastScanAt: patch.lastScanAt ?? cur.lastScanAt,
  };
  localStorage.setItem(STATS_KEY, JSON.stringify(next));
  return next;
}
