import { signInWithGitHub } from "@/app/actions";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-ink text-paper">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 70% -10%, rgba(200,245,66,0.16), transparent 55%), radial-gradient(ellipse 50% 40% at 10% 90%, rgba(255,176,32,0.08), transparent 50%), linear-gradient(180deg, #0b0e0a 0%, #10140d 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="font-semibold tracking-tight text-acid">SlopSweep</div>
        <nav className="flex items-center gap-5 text-sm text-fog">
          <Link href="/demo" className="transition hover:text-paper">
            Try demo
          </Link>
          <Link href="/dashboard" className="transition hover:text-paper">
            Dashboard
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col justify-center px-6 pb-20 pt-8">
        <div className="relative max-w-3xl animate-fade-up">
          <div
            aria-hidden
            className="animate-sweep-beam pointer-events-none absolute -left-10 top-8 h-24 w-1/2 bg-gradient-to-r from-transparent via-acid/30 to-transparent blur-md"
          />
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.22em] text-acid-dim">
            March 2026 residue · still in your PRs
          </p>
          <h1 className="text-5xl font-extrabold leading-[0.95] tracking-tight text-paper sm:text-7xl">
            SlopSweep
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-fog sm:text-xl">
            Copilot pasted product tips into pull requests. GitHub turned it off.
            The junk stayed. Sweep it out of your repos in one pass.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <form action={signInWithGitHub}>
              <button
                type="submit"
                className="rounded-sm bg-acid px-6 py-3 text-sm font-semibold text-ink transition hover:brightness-110"
              >
                Sign in with GitHub
              </button>
            </form>
            <Link
              href="/demo"
              className="rounded-sm border border-line px-6 py-3 text-sm font-medium text-paper transition hover:border-acid/40 hover:text-acid"
            >
              Paste a PR body
            </Link>
          </div>
          <p className="mt-8 max-w-lg font-mono text-xs leading-relaxed text-fog/80">
            Detects{" "}
            <span className="text-paper/90">START COPILOT CODING AGENT TIPS</span>{" "}
            blocks and known Raycast / Slack / Teams / IDE promo lines. Edits PR
            descriptions only — never your code.
          </p>
        </div>
      </main>
    </div>
  );
}
