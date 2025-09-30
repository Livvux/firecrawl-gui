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

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-slate-950 text-slate-100 antialiased`}
      >
        <div className="min-h-screen bg-slate-950">
          <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
            <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Firecrawl
                </p>
                <h1 className="text-2xl font-semibold text-white">
                  Self-Hosted Console
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  Manage requests against your Firecrawl v2 instance.
                </p>
              </div>
              <Navigation />
            </div>
          </header>
          <main className="mx-auto flex max-w-6xl flex-1 flex-col gap-8 px-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
