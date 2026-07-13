import { GitHubSignInButton } from "@/components/GitHubSignInButton";
import { Reveal } from "@/components/Reveal";
import { SiteHeader } from "@/components/SiteHeader";
import Link from "next/link";

function FlowDiagram() {
  return (
    <svg
      viewBox="0 0 640 160"
      className="h-auto w-full"
      role="img"
      aria-label="Flow: GitHub to scan to preview to clean"
    >
      <defs>
        <marker
          id="arrow"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill="#71717a" />
        </marker>
      </defs>
      {[
        { x: 20, label: "GitHub", sub: "OAuth" },
        { x: 180, label: "Scan", sub: "PRs + READMEs" },
        { x: 340, label: "Preview", sub: "Before / after" },
        { x: 500, label: "Clean", sub: "On confirm" },
      ].map((n, i) => (
        <g key={n.label}>
          <rect
            x={n.x}
            y={36}
            width={120}
            height={72}
            rx="10"
            fill={i === 3 ? "#09090b" : "#fff"}
            stroke="#e4e4e7"
            strokeWidth="1.5"
          />
          <text
            x={n.x + 60}
            y={68}
            textAnchor="middle"
            fill={i === 3 ? "#fff" : "#09090b"}
            fontSize="15"
            fontWeight="600"
          >
            {n.label}
          </text>
          <text
            x={n.x + 60}
            y={90}
            textAnchor="middle"
            fill={i === 3 ? "#a1a1aa" : "#71717a"}
            fontSize="12"
          >
            {n.sub}
          </text>
          {i < 3 && (
            <line
              className="flow-line"
              x1={n.x + 124}
              y1={72}
              x2={n.x + 176}
              y2={72}
              stroke="#71717a"
              strokeWidth="1.5"
              markerEnd="url(#arrow)"
            />
          )}
        </g>
      ))}
    </svg>
  );
}

function SafetyDiagram() {
  const rows = [
    { ok: false, label: "Delete repository" },
    { ok: false, label: "Force-push / rewrite commits" },
    { ok: false, label: "Modify source files (except README clean)" },
    { ok: true, label: "Read repos & PR descriptions" },
    { ok: true, label: "Edit PR body after you confirm" },
    { ok: true, label: "Update README tip residue after you confirm" },
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="grid grid-cols-[1fr_auto] border-b border-line bg-surface/60 px-4 py-2 text-xs font-medium text-muted">
        <span>Operation</span>
        <span>Allowed?</span>
      </div>
      <ul className="divide-y divide-line">
        {rows.map((row) => (
          <li
            key={row.label}
            className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 text-sm"
          >
            <span>{row.label}</span>
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                row.ok
                  ? "bg-ok-soft text-ok"
                  : "bg-strike-soft text-strike"
              }`}
            >
              {row.ok ? "Yes" : "Never"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function IsoStack() {
  return (
    <div className="relative mx-auto h-56 w-full max-w-md" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 20%, rgba(24,24,27,0.06), transparent 55%)",
        }}
      />
      {[
        { y: 28, rotate: -8, label: "README.md", tint: "#f4f4f5", delay: "0s" },
        { y: 58, rotate: -3, label: "PR #482", tint: "#fff", delay: "0.4s" },
        { y: 88, rotate: 4, label: "tips stripped", tint: "#09090b", delay: "0.8s" },
      ].map((card, i) => (
        <div
          key={card.label}
          className="animate-float absolute left-1/2 w-56 -translate-x-1/2 rounded-lg border border-line px-4 py-3 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)]"
          style={{
            top: card.y,
            background: card.tint,
            ["--r" as string]: `${card.rotate}deg`,
            animationDelay: card.delay,
            zIndex: i + 1,
            color: i === 2 ? "#fff" : "#09090b",
            transform: `translateX(-50%) rotate(${card.rotate}deg)`,
          }}
        >
          <p className="font-mono text-[11px] opacity-70">{card.label}</p>
          <p className="mt-1 text-sm font-medium">
            {i < 2 ? "Contains tip residue" : "Clean commit ready"}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteHeader active="home" />

      <main>
        <section className="relative overflow-hidden border-b border-line">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(9,9,11,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(9,9,11,0.04) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage:
                "linear-gradient(to bottom, black, transparent 85%)",
            }}
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:gap-16 lg:py-24">
            <Reveal variant="left" className="max-w-xl">
              <p className="text-sm font-medium text-muted">SlopSweep</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                Sweep Copilot tips out of PRs and READMEs
              </h1>
              <p className="mt-5 text-base leading-7 text-muted">
                In March 2026, Copilot wrote promotional tips into pull request
                text. GitHub killed the feature. The junk stayed. SlopSweep
                finds residue in PR descriptions and root READMEs — then lets
                you clean it after a preview.
              </p>
              <div className="mt-8 flex max-w-sm flex-col gap-3 sm:flex-row">
                <div className="flex-1">
                  <GitHubSignInButton label="Get started" />
                </div>
                <Link
                  href="/inspect"
                  className="inline-flex items-center justify-center rounded-md border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface"
                >
                  Inspect a public PR
                </Link>
              </div>
              <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-line pt-8">
                <div>
                  <dt className="text-xs text-muted">Scan</dt>
                  <dd className="mt-1 text-sm font-medium">Read-only</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Clean</dt>
                  <dd className="mt-1 text-sm font-medium">Confirmed write</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Repos</dt>
                  <dd className="mt-1 text-sm font-medium">Never deleted</dd>
                </div>
              </dl>
            </Reveal>
            <Reveal variant="scale" delay={120}>
              <IsoStack />
            </Reveal>
          </div>
        </section>

        <section id="how" className="border-b border-line bg-surface/40">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <Reveal>
              <h2 className="text-2xl font-semibold tracking-tight">
                How it works
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                One path from OAuth to a confirmed edit. Nothing runs on your
                repos until you click Clean.
              </p>
            </Reveal>
            <Reveal delay={80} className="mt-10 rounded-xl border border-line bg-white p-6">
              <FlowDiagram />
            </Reveal>
            <ol className="mt-10 grid gap-8 sm:grid-cols-3">
              <Reveal delay={0} variant="up">
              <li>
                <span className="font-mono text-sm text-muted">01</span>
                <p className="mt-2 font-medium">Connect GitHub</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  OAuth with <code className="font-mono text-ink">read:user</code>{" "}
                  and <code className="font-mono text-ink">repo</code> so we can
                  read PRs and optionally update bodies / READMEs.
                </p>
              </li>
              </Reveal>
              <Reveal delay={100} variant="up">
              <li>
                <span className="font-mono text-sm text-muted">02</span>
                <p className="mt-2 font-medium">Scan PRs &amp; READMEs</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Pick repos. Scan recent PRs for tip markers, and check each
                  README for tips, placeholders, and missing basics. Missing
                  READMEs can be drafted by AI from repo metadata.
                </p>
              </li>
              </Reveal>
              <Reveal delay={200} variant="up">
              <li>
                <span className="font-mono text-sm text-muted">03</span>
                <p className="mt-2 font-medium">Preview, then clean</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Diff before/after. Clean one item or bulk-clean. Export a JSON
                  report for your notes.
                </p>
              </li>
              </Reveal>
            </ol>
          </div>
        </section>

        <section className="border-b border-line">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2">
            <Reveal>
              <h2 className="text-2xl font-semibold tracking-tight">
                What gets removed
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Detection targets the March 2026 tip format — marker blocks and
                known promo lines — not random marketing text.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "<!-- START COPILOT CODING AGENT TIPS --> blocks",
                  "Raycast / Slack / Teams / VS Code promo lines",
                  "JetBrains and Eclipse tip variants",
                  "README health: missing file, TODOs, AI filler",
                  "AI draft README when a repo has none",
                ].map((item, i) => (
                  <Reveal key={item} delay={i * 60} variant="left">
                    <li className="flex gap-3 rounded-lg border border-line bg-white px-4 py-3">
                      <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-ink text-center text-xs leading-5 text-white">
                        ✓
                      </span>
                      <span>{item}</span>
                    </li>
                  </Reveal>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={100} variant="scale">
            <div className="rounded-xl border border-line bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-line px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-strike/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-ok/80" />
                <span className="ml-2 font-mono text-xs text-muted">
                  pull_request.md
                </span>
              </div>
              <div className="grid divide-y divide-line md:grid-cols-2 md:divide-x md:divide-y-0">
                <div className="p-4">
                  <p className="mb-3 text-xs font-medium text-muted">Before</p>
                  <pre className="font-mono text-[13px] leading-relaxed text-ink/80 whitespace-pre-wrap">{`## Summary
Fixed the login redirect.

<!-- START COPILOT CODING AGENT TIPS -->
Try Raycast to spin up Copilot…
<!-- END COPILOT CODING AGENT TIPS -->`}</pre>
                </div>
                <div className="bg-surface/50 p-4">
                  <p className="mb-3 text-xs font-medium text-muted">After</p>
                  <pre className="font-mono text-[13px] leading-relaxed text-ink/80 whitespace-pre-wrap">{`## Summary
Fixed the login redirect.`}</pre>
                </div>
              </div>
            </div>
            </Reveal>
          </div>
        </section>

        <section className="border-b border-line bg-surface/40">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2">
            <Reveal>
              <h2 className="text-2xl font-semibold tracking-tight">
                Safety model
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Built to be boringly safe. Scan never writes. Clean is opt-in
                and scoped.
              </p>
            </Reveal>
            <Reveal delay={80} variant="left">
              <SafetyDiagram />
            </Reveal>
          </div>
        </section>

        <section className="border-b border-line">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <Reveal>
              <h2 className="text-2xl font-semibold tracking-tight">
                Dashboard toolkit
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                More than a single scan button — filters, README health, AI
                drafts, bulk actions, and account switching.
              </p>
            </Reveal>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "PR tip scanner",
                  body: "Open/closed PRs, per-repo depth, grouped results, preview + clean.",
                },
                {
                  title: "README health",
                  body: "Score each README: missing file, tip residue, TODOs, thin docs.",
                },
                {
                  title: "AI README writer",
                  body: "No README? Generate a draft from repo metadata, preview, then commit.",
                },
                {
                  title: "Bulk clean",
                  body: "Confirm once, clean many PR bodies. Tip-clean READMEs one by one.",
                },
                {
                  title: "Change account",
                  body: "Switch GitHub users without hunting through browser settings.",
                },
                {
                  title: "Export JSON",
                  body: "Download a report of hits for audits or portfolio write-ups.",
                },
              ].map((card, i) => (
                <Reveal key={card.title} delay={i * 50} variant="up">
                  <div className="h-full rounded-xl border border-line bg-white p-5">
                    <h3 className="font-medium">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{card.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <Reveal variant="scale">
            <div className="rounded-2xl border border-line bg-ink px-8 py-10 text-white sm:px-12">
              <h2 className="text-2xl font-semibold tracking-tight">
                Ready to clean your history?
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
                Sign in, pick repos, scan. You stay in control of every write.
              </p>
              <div className="mt-6 max-w-xs">
                <GitHubSignInButton
                  label="Open dashboard"
                  className="!border-white/20 !bg-white !text-ink hover:!bg-white/90"
                />
              </div>
            </div>
          </Reveal>
        </section>
      </main>
    </div>
  );
}
