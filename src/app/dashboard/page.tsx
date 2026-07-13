import { DashboardClient } from "@/components/DashboardClient";
import Link from "next/link";

export default function DashboardPage() {
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
        <DashboardClient />
      </main>
    </div>
  );
}
