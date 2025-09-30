import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ReactNode } from "react";
import { Navigation } from "@/components/layout/Navigation";
import "./globals.css";

const themeBootstrapScript = `(() => {
  try {
    const raw = localStorage.getItem('firecrawl-config');
    const parsed = raw ? JSON.parse(raw) : undefined;
    const theme = parsed?.theme === 'light' ? 'light' : 'dark';
    const root = document.documentElement;
    root.classList.remove(theme === 'light' ? 'dark' : 'light');
    root.classList.add(theme);
  } catch (error) {
    const root = document.documentElement;
    root.classList.remove('light');
    root.classList.add('dark');
  }
})();`;

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
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} text-primary antialiased`}>
        <div className="relative min-h-screen">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 transition-[background] duration-300"
            style={{ background: "var(--body-background)" }}
          />
          <header className="border-b border-subtle bg-surface-subtle backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 lg:px-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/10 text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
                  FC
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.3em] text-secondary">
                    Firecrawl
                  </p>
                  <h1 className="text-lg font-semibold text-primary">
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
