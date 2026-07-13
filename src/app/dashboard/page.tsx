import { signOutAction } from "@/app/actions";
import { auth } from "@/auth";
import { DashboardClient } from "@/components/DashboardClient";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const oauthConfigured = Boolean(
    process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET,
  );

  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-semibold text-acid">
          SlopSweep
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/demo" className="text-fog hover:text-paper">
            Demo
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-fog transition hover:text-paper"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-16">
        {!oauthConfigured && (
          <div className="mb-6 rounded-sm border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
            GitHub OAuth env vars are missing. Add{" "}
            <code className="font-mono">AUTH_GITHUB_ID</code> and{" "}
            <code className="font-mono">AUTH_GITHUB_SECRET</code> to{" "}
            <code className="font-mono">.env.local</code> (see README). You can
            still use the{" "}
            <Link href="/demo" className="underline">
              paste demo
            </Link>
            .
          </div>
        )}
        <DashboardClient
          userName={session.user.name}
          userLogin={session.user.login}
        />
      </main>
    </div>
  );
}
