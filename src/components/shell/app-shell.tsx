"use client";

import { useState, type ReactNode } from "react";
import type { User } from "@/lib/types";
import { Sidebar } from "./sidebar";
import { Topbar, type RoomOption } from "./topbar";
import { X } from "lucide-react";

export function AppShell({
  user,
  rooms,
  currentRoomId,
  children,
}: {
  user: User;
  rooms: RoomOption[];
  currentRoomId: string | null;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="fixed inset-y-0 w-64">
          <Sidebar />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 max-w-[80%]">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-2 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={user}
          rooms={rooms}
          currentRoomId={currentRoomId}
          onOpenMenu={() => setMobileOpen(true)}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
