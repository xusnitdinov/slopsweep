"use client";

import { diffLines, type DiffLine } from "@/lib/diff";
import { useMemo } from "react";

type Props = {
  before: string;
  after: string;
  className?: string;
};

function rowClass(type: DiffLine["type"]) {
  if (type === "add") return "bg-ok-soft/70 text-ok";
  if (type === "del") return "bg-strike-soft/70 text-strike";
  return "text-ink/80";
}

function prefix(type: DiffLine["type"]) {
  if (type === "add") return "+";
  if (type === "del") return "-";
  return " ";
}

export function LineDiff({ before, after, className = "" }: Props) {
  const lines = useMemo(() => diffLines(before, after), [before, after]);
  const changed = lines.filter((l) => l.type !== "same").length;

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>Line diff</span>
        <span>
          {changed} changed line{changed === 1 ? "" : "s"}
        </span>
      </div>
      <pre className="max-h-72 overflow-auto rounded-md border border-line bg-white font-mono text-xs leading-5">
        {lines.map((line, idx) => (
          <div
            key={`${line.type}-${idx}-${line.oldLine ?? ""}-${line.newLine ?? ""}`}
            className={`grid grid-cols-[2.5rem_2.5rem_1.25rem_1fr] gap-1 px-2 whitespace-pre-wrap ${rowClass(line.type)}`}
          >
            <span className="select-none text-right text-muted/70">
              {line.oldLine ?? ""}
            </span>
            <span className="select-none text-right text-muted/70">
              {line.newLine ?? ""}
            </span>
            <span className="select-none font-semibold">{prefix(line.type)}</span>
            <span>{line.text || " "}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}
