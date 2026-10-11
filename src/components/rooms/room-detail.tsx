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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/shell/page-header";
import type { ActionResult } from "@/lib/action-result";
import { computeBalances } from "@/lib/balances";
import { TIMEZONES } from "@/lib/constants";
import { formatNpr } from "@/lib/money";
import type { Expense, Member, Room, RoomRole, Settlement } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import {
  Archive,
  ArchiveRestore,
  Check,
  Copy,
  Crown,
  LogOut,
  MoreVertical,
  Shield,
  UserMinus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useEffect, useTransition } from "react";

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
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
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

  /** Run a server action and report the outcome in the notice bar. */
  function act<T>(
    action: () => Promise<ActionResult<T>>,
    success: string | ((data: T) => string),
    after?: () => void,
  ) {
    setMenuFor(null);
    setConfirm(null);
    startAction(async () => {
      const result = await action();
      setNotice(
        result.ok
          ? { ok: true, text: typeof success === "string" ? success : success(result.data) }
          : { ok: false, text: result.error },
      );
      if (result.ok) after?.();
    });
  }

  function copyCode() {
    navigator.clipboard?.writeText(room.inviteCode).then(() => {
      setCopied(true);
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
          description: "They'll lose access to the room. Their past expenses stay in the history.",
          body: "A member with an outstanding balance can't be removed until they settle up — this keeps the room's ledger consistent.",
          button: "Remove member",
        }
      : confirm?.kind === "transfer"
        ? {
            title: `Make ${confirm.member.name} the owner?`,
            description: "A room has exactly one owner.",
            body: "They'll get full control of the room, and you'll become an admin. Only they can transfer it back.",
            button: "Transfer ownership",
          }
        : {
            title: "Leave this room?",
            description: "You'll lose access to the room.",
            body: "Your past expenses remain in the room's history. You need a zero balance to leave, and an owner must transfer ownership first.",
            button: "Leave room",
          };

  return (
    <div>
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
          <>
            <Link href="/rooms">
              <Button variant="ghost">← All rooms</Button>
            </Link>
            {canManage && <Button onClick={() => setInviteOpen(true)}>Invite</Button>}
          </>
        }
      />

      {notice && (
        <div
          className={`mb-5 flex items-start justify-between gap-3 rounded-lg px-4 py-3 text-sm ${
            notice.ok ? "bg-primary-soft text-primary" : "bg-warning-soft text-warning"
          }`}
        >
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="font-medium hover:underline">
            Dismiss
          </button>
        </div>
      )}

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
                    <p className="flex items-center gap-2 truncate text-sm font-medium">
                      {m.name}
                      {isMe && <span className="text-xs text-muted">(you)</span>}
                    </p>
                    <p className="truncate text-xs text-muted">{m.email}</p>
                  </div>
                  <Badge tone={roleTone[m.role]} className="capitalize">
                    {m.role}
                  </Badge>
                  <div className="w-28 text-right">
                    <p
                      className={`text-sm font-semibold tabular ${
                        net > 0 ? "text-positive" : net < 0 ? "text-negative" : "text-muted"
                      }`}
                    >
                      {formatNpr(net, { sign: true })}
                    </p>
                    <p className="text-[11px] text-muted">
                      joined {formatDate(m.joinedAt, { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  {canManage && m.role !== "owner" && !isMe ? (
                    <MemberMenu
                      open={menuFor === m.userId}
                      onToggle={() => setMenuFor((v) => (v === m.userId ? null : m.userId))}
                      onClose={() => setMenuFor(null)}
                      onMakeAdmin={() =>
                        act(
                          () => changeRoleAction(room.id, m.userId, "admin"),
                          `${m.name} is now an admin.`,
                        )
                      }
                      onMakeMember={() =>
                        act(
                          () => changeRoleAction(room.id, m.userId, "member"),
                          `${m.name} is now a member.`,
                        )
                      }
                      onMakeOwner={
                        isOwner
                          ? () => {
                              setMenuFor(null);
                              setConfirm({ kind: "transfer", member: m });
                            }
                          : undefined
                      }
                      onRemove={() => {
                        setMenuFor(null);
                        setConfirm({ kind: "remove", member: m });
                      }}
                      isAdmin={m.role === "admin"}
                    />
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
            </CardHeader>
            <CardContent>
              <p className="mb-2 text-sm text-muted">
                Share this code so flatmates can join the room.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm font-semibold tracking-wider">
                  {room.inviteCode}
                </code>
                <Button variant="outline" size="icon" onClick={copyCode} aria-label="Copy code">
                  {copied ? <Check size={16} className="text-positive" /> : <Copy size={16} />}
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
                <Select
                  id="rtz"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  disabled={!canManage}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </Select>
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
                <LogOut size={15} /> Leave room
              </Button>
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-negative"
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
                      <ArchiveRestore size={15} /> Unarchive room
                    </>
                  ) : (
                    <>
                      <Archive size={15} /> Archive room
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
            <Input id="iemail" name="email" type="email" placeholder="flatmate@example.com" autoFocus />
          </div>
          <div className="rounded-lg bg-surface-2 px-3 py-2 text-sm">
            <span className="text-muted">Or share code: </span>
            <span className="font-semibold tracking-wider">{room.inviteCode}</span>
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
      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirmCopy.title}
        description={confirmCopy.description}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={runConfirm}>
              {confirmCopy.button}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{confirmCopy.body}</p>
      </Modal>
    </div>
  );
}

function MemberMenu({
  open,
  onToggle,
  onClose,
  onMakeAdmin,
  onMakeMember,
  onMakeOwner,
  onRemove,
  isAdmin,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onMakeAdmin: () => void;
  onMakeMember: () => void;
  /** Only the owner can hand the room over. */
  onMakeOwner?: () => void;
  onRemove: () => void;
  isAdmin: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={onToggle}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2"
        aria-label="Member actions"
      >
        <MoreVertical size={18} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-lg border border-border bg-surface p-1 shadow-lg">
          {isAdmin ? (
            <button onClick={onMakeMember} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-surface-2">
              <Shield size={15} /> Make member
            </button>
          ) : (
            <button onClick={onMakeAdmin} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-surface-2">
              <Shield size={15} /> Make admin
            </button>
          )}
          {onMakeOwner && (
            <button onClick={onMakeOwner} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-surface-2">
              <Crown size={15} /> Make owner
            </button>
          )}
          <button onClick={onRemove} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-negative hover:bg-surface-2">
            <UserMinus size={15} /> Remove
          </button>
        </div>
      )}
    </div>
  );
}
