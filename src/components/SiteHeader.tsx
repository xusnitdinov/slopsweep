import Link from "next/link";

type Props = {
  active?: "home" | "dashboard";
};

export function SiteHeader({ active }: Props) {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[15px] font-semibold text-ink"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-xs font-bold text-white">
            SS
          </span>
          SlopSweep
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/dashboard"
            className={`rounded-md px-3 py-1.5 transition ${
              active === "dashboard"
                ? "bg-surface text-ink"
                : "text-muted hover:text-ink"
            }`}
          >
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
