import { GitHubSignInButton } from "@/components/GitHubSignInButton";
import { SiteHeader } from "@/components/SiteHeader";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteHeader active="home" />

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 lg:pt-24">
          <div className="grid items-start gap-16 lg:grid-cols-2 lg:gap-20">
            <div className="max-w-lg">
              <p className="text-sm font-medium text-muted">
                GitHub pull request cleanup
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
                Remove Copilot tips from PR descriptions
              </h1>
              <p className="mt-5 text-base leading-7 text-muted">
                In March 2026, Copilot injected promotional tips into pull
                request text. GitHub disabled the feature, but the residue
                remains. SlopSweep finds it and strips it — without touching
                your code or deleting repos.
              </p>

              <div className="mt-8 max-w-sm">
                <GitHubSignInButton label="Get started" />
              </div>

              <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-line pt-8">
                <div>
                  <dt className="text-xs text-muted">Scan</dt>
                  <dd className="mt-1 text-sm font-medium">Read-only</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Clean</dt>
                  <dd className="mt-1 text-sm font-medium">PR body only</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Repos</dt>
                  <dd className="mt-1 text-sm font-medium">Never deleted</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg border border-line bg-white shadow-sm">
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
Fixed the login redirect bug.

## Test plan
- [x] Expire session & retry

<!-- START COPILOT CODING AGENT TIPS -->
Try Raycast to spin up Copilot tasks…
<!-- END COPILOT CODING AGENT TIPS -->`}</pre>
                </div>
                <div className="bg-surface/50 p-4">
                  <p className="mb-3 text-xs font-medium text-muted">After</p>
                  <pre className="font-mono text-[13px] leading-relaxed text-ink/80 whitespace-pre-wrap">{`## Summary
Fixed the login redirect bug.

## Test plan
- [x] Expire session & retry`}</pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-line bg-surface/40">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-lg font-semibold">How it works</h2>
            <ol className="mt-8 grid gap-8 sm:grid-cols-3">
              <li>
                <span className="font-mono text-sm text-muted">01</span>
                <p className="mt-2 font-medium">Connect GitHub</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  OAuth sign-in. SlopSweep requests read access to repos and
                  PRs.
                </p>
              </li>
              <li>
                <span className="font-mono text-sm text-muted">02</span>
                <p className="mt-2 font-medium">Scan pull requests</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Select repos and scan open or closed PRs for known tip
                  markers.
                </p>
              </li>
              <li>
                <span className="font-mono text-sm text-muted">03</span>
                <p className="mt-2 font-medium">Review and clean</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Preview the diff, then confirm to update the PR description.
                </p>
              </li>
            </ol>
          </div>
        </section>
      </main>
    </div>
  );
}
