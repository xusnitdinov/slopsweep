import Image from "next/image";
import Link from "next/link";

type Props = {
  active?: "home" | "dashboard" | "inspect" | "stats";
};

export function SiteHeader({ active }: Props) {
  const link = (href: string, key: Props["active"], label: string) => (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 transition ${
        active === key ? "bg-surface text-ink" : "text-muted hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[15px] font-semibold text-ink"
        >
          <Image
            src="/icon.png"
            alt=""
            width={28}
            height={28}
            className="rounded-md"
            priority
          />
          SlopSweep
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {link("/inspect", "inspect", "Inspect")}
          {link("/stats", "stats", "Stats")}
          {link("/dashboard", "dashboard", "Dashboard")}
        </nav>
      </div>
    </header>
  );
}
