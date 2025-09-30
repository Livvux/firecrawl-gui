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
      {navItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-2 transition-colors",
              isActive
                ? "bg-slate-800 text-white"
                : "text-slate-300 hover:bg-slate-800/70 hover:text-white",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
};
