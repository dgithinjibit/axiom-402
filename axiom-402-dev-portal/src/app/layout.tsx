import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "axiom-402 — Verifiable Agent Economics",
    template: "%s | axiom-402",
  },
  description:
    "A verifiable economic reasoning layer for autonomous AI agents, powered by MeTTa symbolic AI and NEAR Protocol.",
  openGraph: {
    title: "axiom-402",
    description: "Verifiable agent economics on NEAR Protocol.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          inter.variable,
          "min-h-screen bg-background font-sans antialiased"
        )}
      >
        <NavBar />
        <main className="container mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
