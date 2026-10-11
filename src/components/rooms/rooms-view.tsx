"use client";

import { createRoomAction, joinRoomAction, respondToInviteAction } from "@/app/actions/rooms";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormError } from "@/components/ui/form-error";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { OptionSelect } from "@/components/ui/select";
import { PageHeader } from "@/components/shell/page-header";
import { TIMEZONES } from "@/lib/constants";
import { formatNpr } from "@/lib/money";
import type { PendingInvite, Room } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { DoorOpen, Home, Mail, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

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
      toast.success(`Room “${result.data.name}” created`, {
        description: `Share code ${result.data.inviteCode} to invite flatmates.`,
        duration: 10000,
      });
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
      toast.success(`You joined “${result.data.name}”`);
    });
  }

  function respond(invite: PendingInvite, accept: boolean) {
    startAction(async () => {
      const result = await respondToInviteAction(invite.id, accept);
      if (!result.ok) toast.error(result.error);
      else if (accept) toast.success(`You joined “${result.data.roomName}”`);
      else toast(`Invitation to “${result.data.roomName}” declined`);
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
              <DoorOpen /> Join
            </Button>
            <Button onClick={openCreate}>
              <Plus /> Create room
            </Button>
          </>
        }
      />

      {/* Pending invitations */}
      {invites.length > 0 && (
        <Card className="mb-5 border-primary/30">
          <CardHeader>
            <CardTitle>Invitations</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {invites.map((invite) => (
              <div key={invite.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Mail size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{invite.roomName}</p>
                  <p className="text-xs text-muted-foreground">
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
          <EmptyState
            className="py-16"
            icon={<Home />}
            title="You're not in a room yet"
            description="Create one for your flat, or join with an invite code a flatmate shared."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={openJoin}>
                  <DoorOpen /> Join with a code
                </Button>
                <Button onClick={openCreate}>
                  <Plus /> Create room
                </Button>
              </div>
            }
          />
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
              className="group rounded-xl border border-border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft font-semibold text-primary">
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
              <h3 className="mt-3 truncate font-semibold tracking-tight group-hover:text-primary">
                {room.name}
              </h3>
              {room.description && (
                <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                  {room.description}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {active.slice(0, 4).map((m) => (
                    <Avatar
                      key={m.userId}
                      name={m.name}
                      color={m.avatarColor}
                      size="sm"
                      className="ring-2 ring-card"
                    />
                  ))}
                  {active.length > 4 && (
                    <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground ring-2 ring-card">
                      +{active.length - 4}
                    </span>
                  )}
                </div>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users size={13} /> {active.length}
                </span>
              </div>

              <div className="mt-4 border-t border-border pt-3 text-sm">
                <span className="text-muted-foreground">Your balance: </span>
                <span
                  className={cn(
                    "font-semibold tabular",
                    net > 0 && "text-positive",
                    net < 0 && "text-negative",
                  )}
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
          <FormError message={error} />
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
              <OptionSelect
                id="timezone"
                name="timezone"
                defaultValue="Asia/Kathmandu"
                options={TIMEZONES.map((tz) => ({ value: tz, label: tz }))}
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <OptionSelect
                id="currency"
                defaultValue="NPR"
                disabled
                options={[{ value: "NPR", label: "NPR (Rs)" }]}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Create room
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
          <FormError message={error} />
          <div>
            <Label htmlFor="code">Invite code</Label>
            <Input
              id="code"
              name="code"
              placeholder="e.g. RK-ABCD-2345"
              autoFocus
              className="font-mono uppercase tracking-wider"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setJoinOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Join room
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
