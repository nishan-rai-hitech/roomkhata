"use client";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { User } from "@/lib/types";
import { useState, type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar, type RoomOption } from "./topbar";

export function AppShell({
  user,
  isAdmin,
  rooms,
  currentRoomId,
  children,
}: {
  user: User;
  isAdmin: boolean;
  rooms: RoomOption[];
  currentRoomId: string | null;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="no-print hidden w-64 shrink-0 lg:block">
        <div className="fixed inset-y-0 w-64">
          <Sidebar user={user} isAdmin={isAdmin} />
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&>button]:text-sidebar-foreground"
        >
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Main navigation</SheetDescription>
          <Sidebar user={user} isAdmin={isAdmin} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={user}
          rooms={rooms}
          currentRoomId={currentRoomId}
          onOpenMenu={() => setMobileOpen(true)}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl animate-in fade-in slide-in-from-bottom-1 duration-300">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
