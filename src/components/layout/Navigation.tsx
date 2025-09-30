"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/playground", label: "Playground" },
  { href: "/activity", label: "Activity" },
  { href: "/usage", label: "Usage" },
  { href: "/keys", label: "API Keys" },
  { href: "/settings", label: "Settings" },
  { href: "/whats-new", label: "What's New" },
];

export const Navigation = () => {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 text-sm">
      <div className="flex flex-wrap items-center gap-1 rounded-full border border-subtle bg-surface-subtle p-1 shadow-subtle">
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-4 py-1.5 transition focus-visible:outline-none",
                isActive
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-secondary hover:bg-surface-muted hover:text-primary",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
