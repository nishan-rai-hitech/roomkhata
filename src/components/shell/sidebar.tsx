"use client";

import { logoutAction } from "@/app/actions/auth";
import { Logo } from "@/components/brand";
import { Avatar } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNavItem, navItems } from "./nav";

export function Sidebar({
  user,
  isAdmin = false,
  onNavigate,
}: {
  user: User;
  isAdmin?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = isAdmin ? [...navItems, adminNavItem] : navItems;

  return (
    <div className="flex h-full flex-col bg-sidebar px-3 py-5 text-sidebar-foreground">
      <Link href="/dashboard" onClick={onNavigate} className="px-3 pb-6">
        <Logo inverted />
      </Link>

      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-sidebar-muted">
        Menu
      </p>
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              {active && (
                <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-sidebar-primary" />
              )}
              <Icon
                size={18}
                strokeWidth={2}
                className={cn(active && "text-sidebar-primary")}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-3 text-xs text-sidebar-muted">
          <p className="font-semibold text-sidebar-foreground">Fair to the paisa</p>
          <p className="mt-1 leading-relaxed">
            Every split is exact, and balances always net to zero.
          </p>
        </div>

        <div className="flex items-center gap-3 border-t border-sidebar-border px-1 pt-3">
          <Avatar name={user.name} color={user.avatarColor} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</p>
            <p className="truncate text-xs text-sidebar-muted">{user.email}</p>
          </div>
          <form action={logoutAction}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="submit"
                  aria-label="Log out"
                  className="inline-flex size-8 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-white"
                >
                  <LogOut size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Log out</TooltipContent>
            </Tooltip>
          </form>
        </div>
      </div>
    </div>
  );
}
