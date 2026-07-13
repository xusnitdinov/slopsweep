import Link from "next/link";
import { GitHubSignInButton } from "@/components/GitHubSignInButton";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-bg text-ink">
      {/* atmosphere: soft wash + grid, not neon glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 80% 0%, rgba(12,110,107,0.09), transparent 55%), radial-gradient(ellipse 45% 35% at 0% 100%, rgba(196,60,44,0.06), transparent 50%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(20,18,16,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(20,18,16,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "linear-gradient(to bottom, black 0%, black 55%, transparent 100%)",
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-7">
        <div className="text-[15px] font-extrabold tracking-tight text-ink">
          SlopSweep
        </div>
        <nav className="flex items-center gap-6 text-sm text-muted">
          <Link href="/demo" className="transition hover:text-ink">
            Try demo
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg transition hover:bg-ink/90"
          >
            Open app
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-5.5rem)] max-w-6xl items-center gap-12 px-6 pb-16 pt-4 lg:grid-cols-2 lg:gap-16">
        <div className="animate-rise max-w-xl">
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
            March 2026 · Copilot tip residue
          </p>
          <h1 className="text-[3.25rem] font-extrabold leading-[0.95] tracking-tight text-ink sm:text-6xl lg:text-[4.25rem]">
            SlopSweep
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted sm:text-xl">
            Copilot left product tips in pull request text. GitHub turned the
            feature off. The junk stayed. Sweep it out — safely.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <div className="w-full max-w-xs sm:w-auto">
              <GitHubSignInButton />
            </div>
            <Link
              href="/demo"
              className="rounded-full border border-line bg-bg/80 px-6 py-3 text-sm font-semibold text-ink transition hover:border-ink/30"
            >
              Paste a PR body
            </Link>
          </div>
          <p className="mt-8 max-w-md text-sm leading-relaxed text-muted">
            Scan is read-only. Clean only edits a PR description after you
            confirm. Never deletes repositories or touches code.
          </p>
        </div>

        {/* visual: contaminated → cleaned */}
        <div className="animate-rise-delay relative">
          <div
            className="absolute -inset-4 rounded-[2rem] bg-bg-2/80 blur-2xl"
            aria-hidden
          />
          <div className="relative overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_60px_-28px_rgba(20,18,16,0.35)]">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
                pull_request.md
              </span>
              <span className="rounded-full bg-strike-soft px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wide text-strike">
                contaminated
              </span>
            </div>
            <div className="space-y-3 p-5 font-mono text-[13px] leading-relaxed text-ink/90">
              <p>## Summary</p>
              <p className="text-muted">Fixed the login redirect bug.</p>
              <p className="pt-2">## Test plan</p>
              <p className="text-muted">- [x] Expire session &amp; retry</p>
              <div className="redact-line redact-fade mt-4 rounded-lg bg-strike-soft/60 px-3 py-2 text-strike">
                &lt;!-- START COPILOT CODING AGENT TIPS --&gt;
              </div>
              <div className="redact-line redact-fade rounded-lg bg-strike-soft/60 px-3 py-2 text-strike">
                Try Raycast to spin up Copilot tasks…
              </div>
              <div className="redact-line redact-fade rounded-lg bg-strike-soft/60 px-3 py-2 text-strike">
                &lt;!-- END COPILOT CODING AGENT TIPS --&gt;
              </div>
            </div>
            <div className="border-t border-line bg-ok-soft/50 px-5 py-3">
              <p className="font-mono text-[11px] uppercase tracking-wider text-ok">
                After clean → tips removed · your summary stays
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
