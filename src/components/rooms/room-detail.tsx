"use client";

import {
  changeRoleAction,
  inviteByEmailAction,
  leaveRoomAction,
  removeMemberAction,
  setRoomArchivedAction,
  transferOwnershipAction,
  updateRoomAction,
} from "@/app/actions/rooms";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { OptionSelect } from "@/components/ui/select";
import { PageHeader } from "@/components/shell/page-header";
import type { ActionResult } from "@/lib/action-result";
import { computeBalances } from "@/lib/balances";
import { TIMEZONES } from "@/lib/constants";
import { formatNpr } from "@/lib/money";
import type { Expense, Member, Room, RoomRole, Settlement } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Check,
  Copy,
  Crown,
  LogOut,
  MoreVertical,
  Shield,
  UserMinus,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

const roleTone: Record<RoomRole, "primary" | "warning" | "neutral"> = {
  owner: "primary",
  admin: "warning",
  member: "neutral",
};

type Confirm =
  | { kind: "remove"; member: Member }
  | { kind: "transfer"; member: Member }
  | { kind: "leave" };

export function RoomDetail({
  room,
  currentUserId,
  expenses,
  settlements,
}: {
  room: Room;
  currentUserId: string;
  expenses: Expense[];
  settlements: Settlement[];
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [name, setName] = useState(room.name);
  const [timezone, setTimezone] = useState(room.timezone);
  const [pending, startAction] = useTransition();

  // People who left stay on the ledger but aren't listed as members.
  const members = room.members.filter((m) => m.active);
  const myRole = members.find((m) => m.userId === currentUserId)?.role ?? "member";
  const isOwner = myRole === "owner";
  const canManage = (isOwner || myRole === "admin") && !room.archived;

  const balances = useMemo(() => {
    const ids = room.members.map((m) => m.userId);
    return computeBalances(ids, expenses, settlements);
  }, [room.members, expenses, settlements]);
  const netOf = (id: string) => balances.find((b) => b.userId === id)?.net ?? 0;

  /** Run a server action and report the outcome as a toast. */
  function act<T>(
    action: () => Promise<ActionResult<T>>,
    success: string | ((data: T) => string),
    after?: () => void,
  ) {
    startAction(async () => {
      const result = await action();
      setConfirm(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(typeof success === "string" ? success : success(result.data));
      after?.();
    });
  }

  function copyCode() {
    navigator.clipboard?.writeText(room.inviteCode).then(() => {
      setCopied(true);
      toast.success("Invite code copied");
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function runConfirm() {
    if (!confirm) return;
    if (confirm.kind === "remove") {
      const m = confirm.member;
      act(() => removeMemberAction(room.id, m.userId), `${m.name} was removed from the room.`);
    } else if (confirm.kind === "transfer") {
      const m = confirm.member;
      act(
        () => transferOwnershipAction(room.id, m.userId),
        `${m.name} is now the owner. You're an admin.`,
      );
    } else {
      act(
        () => leaveRoomAction(room.id),
        "You left the room.",
        () => router.push("/rooms"),
      );
    }
  }

  const confirmCopy =
    confirm?.kind === "remove"
      ? {
          title: `Remove ${confirm.member.name}?`,
          description:
            "They'll lose access to the room. Their past expenses stay in the history. A member with an outstanding balance can't be removed until they settle up — this keeps the room's ledger consistent.",
          button: "Remove member",
        }
      : confirm?.kind === "transfer"
        ? {
            title: `Make ${confirm.member.name} the owner?`,
            description:
              "A room has exactly one owner. They'll get full control of the room, and you'll become an admin. Only they can transfer it back.",
            button: "Transfer ownership",
          }
        : {
            title: "Leave this room?",
            description:
              "You'll lose access to the room. Your past expenses remain in its history. You need a zero balance to leave, and an owner must transfer ownership first.",
            button: "Leave room",
          };

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="no-print -ml-2 mb-2 text-muted-foreground">
        <Link href="/rooms">
          <ArrowLeft /> All rooms
        </Link>
      </Button>
      <PageHeader
        title={room.name}
        subtitle={
          <>
            {room.description ? `${room.description} · ` : ""}
            {members.length} members · {room.timezone}
            {room.archived && " · archived (read-only)"}
          </>
        }
        actions={
          canManage && (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus /> Invite
            </Button>
          )
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* Members */}
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {members.map((m) => {
              const net = netOf(m.userId);
              const isMe = m.userId === currentUserId;
              return (
                <div key={m.userId} className="flex items-center gap-3 py-3">
                  <Avatar name={m.name} color={m.avatarColor} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <span className="truncate">{m.name}</span>
                      {isMe && <span className="text-xs text-muted-foreground">(you)</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <Badge tone={roleTone[m.role]} className="capitalize">
                    {m.role}
                  </Badge>
                  <div className="hidden w-28 text-right sm:block">
                    <p
                      className={cn(
                        "text-sm font-semibold tabular",
                        net > 0
                          ? "text-positive"
                          : net < 0
                            ? "text-negative"
                            : "text-muted-foreground",
                      )}
                    >
                      {formatNpr(net, { sign: true })}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      joined {formatDate(m.joinedAt, { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  {canManage && m.role !== "owner" && !isMe ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground"
                          disabled={pending}
                          aria-label={`Actions for ${m.name}`}
                        >
                          <MoreVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {m.role === "admin" ? (
                          <DropdownMenuItem
                            onSelect={() =>
                              act(
                                () => changeRoleAction(room.id, m.userId, "member"),
                                `${m.name} is now a member.`,
                              )
                            }
                          >
                            <Shield /> Make member
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onSelect={() =>
                              act(
                                () => changeRoleAction(room.id, m.userId, "admin"),
                                `${m.name} is now an admin.`,
                              )
                            }
                          >
                            <Shield /> Make admin
                          </DropdownMenuItem>
                        )}
                        {/* Only the owner can hand the room over. */}
                        {isOwner && (
                          <DropdownMenuItem
                            onSelect={() => setConfirm({ kind: "transfer", member: m })}
                          >
                            <Crown /> Make owner
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setConfirm({ kind: "remove", member: m })}
                        >
                          <UserMinus /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span className="w-9" />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-5">
          {/* Invite */}
          <Card>
            <CardHeader>
              <CardTitle>Invite code</CardTitle>
              <CardDescription>Share this code so flatmates can join the room.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="flex h-10 flex-1 items-center rounded-lg border border-dashed border-input bg-muted px-3 font-mono text-sm font-semibold tracking-wider">
                  {room.inviteCode}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-10"
                  onClick={copyCode}
                  aria-label="Copy code"
                >
                  {copied ? <Check className="text-positive" /> : <Copy />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Room settings */}
          <Card>
            <CardHeader>
              <CardTitle>Room settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="rname">Name</Label>
                <Input
                  id="rname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canManage}
                />
              </div>
              <div>
                <Label htmlFor="rtz">Timezone</Label>
                <OptionSelect
                  id="rtz"
                  value={timezone}
                  onValueChange={setTimezone}
                  disabled={!canManage}
                  options={TIMEZONES.map((tz) => ({ value: tz, label: tz }))}
                />
              </div>
              {canManage && (
                <Button
                  size="sm"
                  className="w-full"
                  disabled={pending}
                  onClick={() =>
                    act(
                      () => updateRoomAction(room.id, { name, timezone }),
                      "Room settings saved.",
                    )
                  }
                >
                  Save changes
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Danger zone */}
          <Card className="border-negative/30">
            <CardHeader>
              <CardTitle className="text-negative">Danger zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                disabled={pending}
                onClick={() => setConfirm({ kind: "leave" })}
              >
                <LogOut /> Leave room
              </Button>
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-negative hover:text-negative"
                  disabled={pending}
                  onClick={() =>
                    act(
                      () => setRoomArchivedAction(room.id, !room.archived),
                      room.archived
                        ? "Room restored. Members can add expenses again."
                        : "Room archived. Its history is kept and is now read-only.",
                    )
                  }
                >
                  {room.archived ? (
                    <>
                      <ArchiveRestore /> Unarchive room
                    </>
                  ) : (
                    <>
                      <Archive /> Archive room
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invite modal */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite a flatmate"
        description="Send an email invite or share the code."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const email = String(new FormData(e.currentTarget).get("email") || "");
            setInviteOpen(false);
            act(
              () => inviteByEmailAction(room.id, { email }),
              (data) =>
                data.emailed
                  ? `Invitation emailed to ${data.email}. It expires in 7 days.`
                  : `Invitation saved for ${data.email}, but the email couldn't be sent. They'll still see it on their Rooms page when signed in with that address, or you can share the code. It expires in 7 days.`,
            );
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="iemail">Email address</Label>
            <Input
              id="iemail"
              name="email"
              type="email"
              placeholder="flatmate@example.com"
              autoFocus
            />
          </div>
          <div className="rounded-lg bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">Or share code: </span>
            <span className="font-mono font-semibold tracking-wider">{room.inviteCode}</span>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Invite</Button>
          </div>
        </form>
      </Modal>

      {/* Remove / transfer / leave confirm */}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmLabel={confirmCopy.button}
        loading={pending}
        onConfirm={runConfirm}
      />
    </div>
  );
}
