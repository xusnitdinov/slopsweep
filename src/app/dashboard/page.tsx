import { auth } from "@/auth";
import { DashboardClient } from "@/components/DashboardClient";
import { GitHubSignInButton } from "@/components/GitHubSignInButton";
import { SiteHeader } from "@/components/SiteHeader";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const login = session?.user?.login ?? session?.user?.name ?? null;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteHeader active="dashboard" />
      <main className="mx-auto max-w-5xl px-6 py-10">
        {!login ? (
          <div className="mx-auto max-w-md">
            <h1 className="text-2xl font-semibold tracking-tight">
              Sign in to continue
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              SlopSweep reads your repos and pull requests, and can edit PR
              descriptions when you confirm a clean. It never deletes
              repositories.
            </p>
            <div className="mt-6">
              <GitHubSignInButton />
            </div>
            <p className="mt-4 text-center text-sm text-muted">
              No account needed for the{" "}
              <Link href="/demo" className="text-ink underline underline-offset-2">
                paste demo
              </Link>
              .
            </p>
          </div>
        ) : (
          <DashboardClient login={login} />
        )}
      </main>
    </div>
  );
}
