"use client";

import { Logo } from "@/components/brand";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col gap-1 border-r border-border bg-surface px-3 py-4">
      <div className="px-2 pb-4">
        <Link href="/dashboard" onClick={onNavigate}>
          <Logo />
        </Link>
      </div>

      <nav className="flex flex-col gap-0.5">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary-soft text-primary"
                  : "text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              <Icon size={18} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-lg bg-surface-2 p-3 text-xs text-muted">
        <p className="font-medium text-foreground">All settled up?</p>
        <p className="mt-1 leading-relaxed">
          Balances across the room always net to exactly zero.
        </p>
      </div>
    </div>
  );
}
