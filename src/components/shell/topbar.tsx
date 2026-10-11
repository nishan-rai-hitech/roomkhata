"use client";

import { logoutAction } from "@/app/actions/auth";
import { switchRoomAction } from "@/app/actions/rooms";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import type { User } from "@/lib/types";
import { ChevronDown, Menu, Plus, Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

export interface RoomOption {
  id: string;
  name: string;
  archived: boolean;
}

function useOutsideClose(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  return ref;
}

export function Topbar({
  user,
  rooms,
  currentRoomId,
  onOpenMenu,
}: {
  user: User;
  rooms: RoomOption[];
  currentRoomId: string | null;
  onOpenMenu: () => void;
}) {
  const [roomOpen, setRoomOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [switching, startSwitch] = useTransition();
  const roomRef = useOutsideClose(() => setRoomOpen(false));
  const userRef = useOutsideClose(() => setUserOpen(false));

  const currentRoom = rooms.find((r) => r.id === currentRoomId);

  function switchRoom(id: string) {
    setRoomOpen(false);
    if (id === currentRoomId) return;
    startSwitch(async () => {
      await switchRoomAction(id);
    });
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-surface/80 px-4 backdrop-blur sm:px-6">
      <button
        onClick={onOpenMenu}
        className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Room switcher */}
      <div className="relative" ref={roomRef}>
        <button
          onClick={() => setRoomOpen((v) => !v)}
          disabled={switching}
          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-semibold hover:bg-surface-2 disabled:opacity-60"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-soft text-xs text-primary">
            {currentRoom ? currentRoom.name.slice(0, 1) : "+"}
          </span>
          <span className="max-w-[12rem] truncate">{currentRoom?.name ?? "No room yet"}</span>
          <ChevronDown size={15} className="text-muted" />
        </button>
        {roomOpen && (
          <div className="absolute left-0 top-full mt-1 w-64 rounded-lg border border-border bg-surface p-1 shadow-lg">
            <p className="px-3 py-1.5 text-xs font-medium text-muted">Your rooms</p>
            {rooms.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted">You&apos;re not in any room yet.</p>
            )}
            {rooms.map((r) => (
              <button
                key={r.id}
                onClick={() => switchRoom(r.id)}
                className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-surface-2"
              >
                <span className="truncate">
                  {r.name}
                  {r.archived && <span className="ml-1.5 text-xs text-muted">(archived)</span>}
                </span>
                {r.id === currentRoomId && <Check size={15} className="shrink-0 text-primary" />}
              </button>
            ))}
            <div className="my-1 h-px bg-border" />
            <Link
              href="/rooms"
              onClick={() => setRoomOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-primary hover:bg-surface-2"
            >
              <Plus size={15} /> Create or join a room
            </Link>
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {currentRoom && !currentRoom.archived && (
          <Link href="/expenses/new" className="hidden sm:block">
            <Button size="sm">
              <Plus size={16} /> Add expense
            </Button>
          </Link>
        )}
        <ThemeToggle />

        {/* User menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setUserOpen((v) => !v)}
            className="flex items-center gap-1 rounded-full hover:opacity-90"
            aria-label="Account menu"
          >
            <Avatar name={user.name} color={user.avatarColor} size="sm" />
          </button>
          {userOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-border bg-surface p-1 shadow-lg">
              <div className="px-3 py-2">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted truncate">{user.email}</p>
              </div>
              <div className="my-1 h-px bg-border" />
              <Link href="/settings" onClick={() => setUserOpen(false)} className="block rounded-md px-3 py-2 text-sm hover:bg-surface-2">
                Settings
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="block w-full rounded-md px-3 py-2 text-left text-sm text-negative hover:bg-surface-2"
                >
                  Log out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
