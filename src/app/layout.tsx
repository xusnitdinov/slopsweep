import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

const display = Inter({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "SlopSweep — remove Copilot tip junk from PRs",
  description:
    "Scan GitHub pull requests for leftover Copilot product tips and strip them from descriptions. Read-only scan. Optional clean.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
