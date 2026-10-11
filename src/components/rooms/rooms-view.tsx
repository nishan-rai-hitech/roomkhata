"use client";

import { createRoomAction, joinRoomAction, respondToInviteAction } from "@/app/actions/rooms";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/shell/page-header";
import { TIMEZONES } from "@/lib/constants";
import { formatNpr } from "@/lib/money";
import type { PendingInvite, Room } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { DoorOpen, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

export function RoomsView({
  rooms,
  nets,
  invites,
}: {
  rooms: Room[];
  /** The signed-in user's net balance per room id. */
  nets: Record<string, number>;
  invites: PendingInvite[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startAction] = useTransition();

  function openCreate() {
    setError(null);
    setCreateOpen(true);
  }

  function openJoin() {
    setError(null);
    setJoinOpen(true);
  }

  function createRoom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = {
      name: String(fd.get("name") || ""),
      description: String(fd.get("description") || ""),
      timezone: String(fd.get("timezone") || "Asia/Kathmandu"),
    };
    setError(null);
    startAction(async () => {
      const result = await createRoomAction(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCreateOpen(false);
      setNotice(
        `Room “${result.data.name}” created. Share code ${result.data.inviteCode} to invite flatmates.`,
      );
    });
  }

  function joinRoom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") || "");
    setError(null);
    startAction(async () => {
      const result = await joinRoomAction({ code });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setJoinOpen(false);
      setNotice(`You joined “${result.data.name}”.`);
    });
  }

  function respond(invite: PendingInvite, accept: boolean) {
    startAction(async () => {
      const result = await respondToInviteAction(invite.id, accept);
      setNotice(
        result.ok
          ? accept
            ? `You joined “${result.data.roomName}”.`
            : `Invitation to “${result.data.roomName}” declined.`
          : result.error,
      );
    });
  }

  return (
    <div>
      <PageHeader
        title="Rooms"
        subtitle="Shared spaces where you split expenses with others."
        actions={
          <>
            <Button variant="outline" onClick={openJoin}>
              <DoorOpen size={16} /> Join
            </Button>
            <Button onClick={openCreate}>
              <Plus size={16} /> Create room
            </Button>
          </>
        }
      />

      {notice && (
        <div className="mb-5 flex items-start justify-between gap-3 rounded-lg bg-primary-soft px-4 py-3 text-sm text-primary">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="font-medium hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Pending invitations */}
      {invites.length > 0 && (
        <Card className="mb-5">
          <CardHeader>
            <CardTitle>Invitations</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {invites.map((invite) => (
              <div key={invite.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{invite.roomName}</p>
                  <p className="text-xs text-muted">
                    Invited by {invite.invitedByName} · expires {formatDate(invite.expiresAt)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => respond(invite, false)}
                >
                  Decline
                </Button>
                <Button size="sm" disabled={pending} onClick={() => respond(invite, true)}>
                  Accept
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {rooms.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted">
            You&apos;re not in a room yet. Create one for your flat, or join with an invite code.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => {
          const net = nets[room.id] ?? 0;
          const active = room.members.filter((m) => m.active);
          return (
            <Link
              key={room.id}
              href={`/rooms/${room.id}`}
              className="group rounded-[var(--radius)] border border-border bg-surface p-5 transition-colors hover:border-border-strong"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft font-semibold text-primary">
                  {room.name.slice(0, 1)}
                </span>
                {room.archived ? (
                  <Badge tone="neutral">Archived</Badge>
                ) : net === 0 ? (
                  <Badge tone="neutral">Settled</Badge>
                ) : net > 0 ? (
                  <Badge tone="positive">You&apos;re owed</Badge>
                ) : (
                  <Badge tone="negative">You owe</Badge>
                )}
              </div>
              <h3 className="mt-3 font-semibold tracking-tight group-hover:text-primary">
                {room.name}
              </h3>
              {room.description && (
                <p className="mt-0.5 line-clamp-1 text-sm text-muted">{room.description}</p>
              )}

              <div className="mt-4 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {active.slice(0, 4).map((m) => (
                    <Avatar
                      key={m.userId}
                      name={m.name}
                      color={m.avatarColor}
                      size="sm"
                      className="ring-2 ring-surface"
                    />
                  ))}
                  {active.length > 4 && (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-xs font-medium text-muted ring-2 ring-surface">
                      +{active.length - 4}
                    </span>
                  )}
                </div>
                <span className="flex items-center gap-1 text-xs text-muted">
                  <Users size={13} /> {active.length}
                </span>
              </div>

              <div className="mt-4 border-t border-border pt-3 text-sm">
                <span className="text-muted">Your balance: </span>
                <span
                  className={`font-semibold tabular ${
                    net > 0 ? "text-positive" : net < 0 ? "text-negative" : "text-foreground"
                  }`}
                >
                  {formatNpr(net, { sign: true })}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Create room modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create a room"
        description="Set up a shared space for your flat, trip, or group."
      >
        <form onSubmit={createRoom} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-negative-soft px-3 py-2 text-sm text-negative">
              {error}
            </div>
          )}
          <div>
            <Label htmlFor="name">Room name</Label>
            <Input id="name" name="name" placeholder="e.g. Baluwatar Flat 3B" autoFocus />
          </div>
          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Input id="description" name="description" placeholder="Short note about the room" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Select id="timezone" name="timezone" defaultValue="Asia/Kathmandu">
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select id="currency" name="currency" defaultValue="NPR" disabled>
                <option value="NPR">NPR (Rs)</option>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create room"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Join room modal */}
      <Modal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        title="Join a room"
        description="Enter the invite code a flatmate shared with you."
      >
        <form onSubmit={joinRoom} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-negative-soft px-3 py-2 text-sm text-negative">
              {error}
            </div>
          )}
          <div>
            <Label htmlFor="code">Invite code</Label>
            <Input id="code" name="code" placeholder="e.g. RK-ABCD-2345" autoFocus className="uppercase" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setJoinOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Joining…" : "Join room"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
