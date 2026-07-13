import { auth } from "@/auth";
import { DashboardClient } from "@/components/DashboardClient";
import { GitHubSignInButton } from "@/components/GitHubSignInButton";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const login = session?.user?.login ?? session?.user?.name ?? null;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-7">
        <Link href="/" className="text-[15px] font-extrabold tracking-tight">
          SlopSweep
        </Link>
        <Link href="/demo" className="text-sm text-muted hover:text-ink">
          Demo
        </Link>
      </header>
      <main className="mx-auto max-w-5xl px-6 pb-16">
        {!login ? (
          <div className="mx-auto max-w-md pt-8">
            <h1 className="text-3xl font-extrabold tracking-tight">Connect</h1>
            <p className="mt-3 text-muted leading-relaxed">
              Sign in with GitHub so SlopSweep can{" "}
              <strong className="font-semibold text-ink">read</strong> your repos
              and PRs, and optionally edit PR{" "}
              <strong className="font-semibold text-ink">descriptions</strong>.
              It never deletes repositories.
            </p>
            <div className="mt-8">
              <GitHubSignInButton />
            </div>
            <p className="mt-6 text-center text-sm text-muted">
              Or{" "}
              <Link href="/demo" className="text-accent hover:underline">
                try the paste demo
              </Link>{" "}
              with no login.
            </p>
          </div>
        ) : (
          <DashboardClient login={login} />
        )}
      </main>
    </div>
  );
}
