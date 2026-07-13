import type { Metadata } from "next";
import { IBM_Plex_Mono, Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const plex = IBM_Plex_Mono({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "SlopSweep — scrub Copilot junk from your PRs",
  description:
    "Scan your GitHub repos for Copilot-injected product tips and clean them with one click. Built for the March 2026 Copilot tips incident.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${syne.variable} ${plex.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
