import { auth } from "@/auth";
import { DashboardClient } from "@/components/DashboardClient";
import { GitHubSignInButton } from "@/components/GitHubSignInButton";
import { SiteHeader } from "@/components/SiteHeader";

export default async function DashboardPage() {
  const session = await auth();
  const login = session?.user?.login ?? session?.user?.name ?? null;

  return (
    <div className="min-h-screen bg-surface/30 text-ink">
      <SiteHeader active="dashboard" />
      <main className="mx-auto max-w-7xl px-6 py-8">
        {!login ? (
          <div className="mx-auto max-w-md rounded-lg border border-line bg-white p-8">
            <h1 className="text-2xl font-semibold tracking-tight">
              Sign in to continue
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              Connect your GitHub account to scan pull requests for Copilot tip
              residue and clean PR descriptions. Repositories are never deleted.
            </p>
            <div className="mt-6">
              <GitHubSignInButton />
            </div>
          </div>
        ) : (
          <DashboardClient
            login={login}
            avatarUrl={session?.user?.image}
          />
        )}
      </main>
    </div>
  );
}
