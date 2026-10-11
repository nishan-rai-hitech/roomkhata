"use client";

import { logoutAction } from "@/app/actions/auth";
import { switchRoomAction } from "@/app/actions/rooms";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { ThemeToggle } from "@/components/theme-toggle";
import type { User } from "@/lib/types";
import { Check, ChevronsUpDown, LogOut, Menu, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

export interface RoomOption {
  id: string;
  name: string;
  archived: boolean;
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
  const [switching, startSwitch] = useTransition();
  const [, startLogout] = useTransition();

  const currentRoom = rooms.find((r) => r.id === currentRoomId);

  function switchRoom(room: RoomOption) {
    if (room.id === currentRoomId) return;
    startSwitch(async () => {
      const result = await switchRoomAction(room.id);
      if (result.ok) toast.success(`Switched to “${room.name}”`);
      else toast.error(result.error);
    });
  }

  return (
    <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenMenu}
        className="shrink-0 lg:hidden"
        aria-label="Open menu"
      >
        <Menu />
      </Button>

      {/* Room switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={switching}
            className="h-10 min-w-0 max-w-xs shrink gap-2.5 px-2.5"
            aria-label="Switch room"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
              {currentRoom ? currentRoom.name.slice(0, 1).toUpperCase() : "+"}
            </span>
            <span className="truncate font-semibold">{currentRoom?.name ?? "No room yet"}</span>
            {switching ? <Spinner /> : <ChevronsUpDown className="text-muted-foreground" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
            Your rooms
          </DropdownMenuLabel>
          {rooms.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              You&apos;re not in any room yet.
            </p>
          )}
          {rooms.map((r) => (
            <DropdownMenuItem key={r.id} onSelect={() => switchRoom(r)}>
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary-soft text-xs font-bold text-primary">
                {r.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="truncate">
                {r.name}
                {r.archived && (
                  <span className="ml-1.5 text-xs text-muted-foreground">(archived)</span>
                )}
              </span>
              {r.id === currentRoomId && <Check className="ml-auto text-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/rooms">
              <Plus /> Create or join a room
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {currentRoom && !currentRoom.archived && (
          <Button asChild size="sm" className="hidden h-9 sm:inline-flex">
            <Link href="/expenses/new">
              <Plus /> Add expense
            </Link>
          </Button>
        )}
        <ThemeToggle />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="rounded-full outline-none ring-offset-2 ring-offset-background transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Account menu"
            >
              <Avatar name={user.name} color={user.avatarColor} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => startLogout(() => logoutAction())}
            >
              <LogOut /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
