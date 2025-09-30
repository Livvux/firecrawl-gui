import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ReactNode } from "react";
import { Navigation } from "@/components/layout/Navigation";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Firecrawl Console",
  description: "Minimal client for self-hosted Firecrawl v2 APIs",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-transparent text-slate-900 antialiased`}
      >
        <div className="relative min-h-screen">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,1)_0%,_rgba(241,245,249,0.9)_55%,_rgba(226,232,240,0.6)_100%)]"
          />
          <header className="border-b border-slate-200/80 bg-white/70 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 lg:px-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/10 text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
                  FC
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.3em] text-slate-400">
                    Firecrawl
                  </p>
                  <h1 className="text-lg font-semibold text-slate-900">
                    Playground Console
                  </h1>
                </div>
              </div>
              <Navigation />
            </div>
          </header>
          <main className="mx-auto w-full max-w-5xl px-6 py-12 lg:px-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
