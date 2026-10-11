"use server";

import { randomInt } from "node:crypto";
import { cookies } from "next/headers";
import type { ActionResult } from "@/lib/action-result";
import { TIMEZONES } from "@/lib/constants";
import { formatNpr } from "@/lib/money";
import {
  ActionError,
  email as parseEmail,
  oneOf,
  optStr,
  requireMember,
  revalidateApp,
  run,
  str,
} from "@/lib/server/action";
import { db } from "@/lib/server/db";
import { appUrl, sendMail } from "@/lib/server/mail";
import { roomNets } from "@/lib/server/nets";
import { rateLimit } from "@/lib/server/rate-limit";
import { ROOM_COOKIE, SECURE_COOKIES, requireUser } from "@/lib/server/session";

const INVITE_DAYS = 7;
// No 0/O/1/I so codes are easy to read aloud and type.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  const part = () =>
    Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
  return `RK-${part()}-${part()}`;
}

async function uniqueInviteCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = randomCode();
    if (!(await db.room.findUnique({ where: { inviteCode: code } }))) return code;
  }
  throw new ActionError("Could not generate an invite code. Try again.");
}

async function selectRoom(roomId: string): Promise<void> {
  (await cookies()).set(ROOM_COOKIE, roomId, {
    httpOnly: true,
    sameSite: "lax",
    secure: SECURE_COOKIES,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/** Add the user to a room, reactivating a previous membership if there is one. */
async function addMember(roomId: string, userId: string): Promise<void> {
  await db.membership.upsert({
    where: { roomId_userId: { roomId, userId } },
    create: { roomId, userId, role: "member" },
    update: { active: true, role: "member", joinedAt: new Date() },
  });
}

export async function createRoomAction(input: {
  name: string;
  description?: string;
  timezone: string;
}): Promise<ActionResult<{ id: string; name: string; inviteCode: string }>> {
  return run(async () => {
    const user = await requireUser();
    const name = str(input?.name, "Room name", 80);
    const description = optStr(input?.description, "Description", 200);
    const timezone = oneOf(input?.timezone, TIMEZONES, "Timezone");
    const room = await db.room.create({
      data: {
        name,
        description,
        timezone,
        inviteCode: await uniqueInviteCode(),
        memberships: { create: { userId: user.id, role: "owner" } },
      },
    });
    await selectRoom(room.id);
    revalidateApp();
    return { id: room.id, name: room.name, inviteCode: room.inviteCode };
  });
}

export async function joinRoomAction(input: {
  code: string;
}): Promise<ActionResult<{ id: string; name: string }>> {
  return run(async () => {
    const user = await requireUser();
    const code = str(input?.code, "Invite code", 40).toUpperCase();
    // Invite codes are bearer secrets, so guessing them is throttled.
    await rateLimit("join", { perIp: 20, perSubject: 10, subject: user.id, minutes: 15 });
    const room = await db.room.findUnique({
      where: { inviteCode: code },
      include: { memberships: true },
    });
    if (!room || room.archivedAt) throw new ActionError("No active room matches that code.");
    if (room.memberships.some((m) => m.userId === user.id && m.active)) {
      throw new ActionError(`You're already a member of “${room.name}”.`);
    }
    await addMember(room.id, user.id);
    await selectRoom(room.id);
    revalidateApp();
    return { id: room.id, name: room.name };
  });
}

export async function switchRoomAction(roomId: string): Promise<ActionResult<null>> {
  return run(async () => {
    await requireMember(roomId, { allowArchived: true });
    await selectRoom(roomId);
    revalidateApp();
    return null;
  });
}

export async function updateRoomAction(
  roomId: string,
  input: { name: string; timezone: string },
): Promise<ActionResult<null>> {
  return run(async () => {
    await requireMember(roomId, { manage: true });
    await db.room.update({
      where: { id: roomId },
      data: {
        name: str(input?.name, "Room name", 80),
        timezone: oneOf(input?.timezone, TIMEZONES, "Timezone"),
      },
    });
    revalidateApp();
    return null;
  });
}

export async function changeRoleAction(
  roomId: string,
  userId: string,
  role: "admin" | "member",
): Promise<ActionResult<null>> {
  return run(async () => {
    const { user, room } = await requireMember(roomId, { manage: true });
    const nextRole = oneOf(role, ["admin", "member"] as const, "Role");
    const target = room.memberships.find((m) => m.userId === userId && m.active);
    if (!target) throw new ActionError("Member not found.");
    if (target.userId === user.id) throw new ActionError("You can't change your own role.");
    if (target.role === "owner") throw new ActionError("The owner's role can't be changed.");
    await db.membership.update({
      where: { roomId_userId: { roomId, userId } },
      data: { role: nextRole },
    });
    revalidateApp();
    return null;
  });
}

export async function transferOwnershipAction(
  roomId: string,
  userId: string,
): Promise<ActionResult<null>> {
  return run(async () => {
    const { user, room, role } = await requireMember(roomId);
    if (role !== "owner") throw new ActionError("Only the owner can transfer ownership.");
    const target = room.memberships.find((m) => m.userId === userId && m.active);
    if (!target || target.userId === user.id) throw new ActionError("Member not found.");
    await db.$transaction([
      db.membership.update({
        where: { roomId_userId: { roomId, userId } },
        data: { role: "owner" },
      }),
      db.membership.update({
        where: { roomId_userId: { roomId, userId: user.id } },
        data: { role: "admin" },
      }),
    ]);
    revalidateApp();
    return null;
  });
}

export async function removeMemberAction(
  roomId: string,
  userId: string,
): Promise<ActionResult<null>> {
  return run(async () => {
    const { user, room } = await requireMember(roomId, { manage: true });
    const target = room.memberships.find((m) => m.userId === userId && m.active);
    if (!target) throw new ActionError("Member not found.");
    if (target.userId === user.id) throw new ActionError("Use “Leave room” to remove yourself.");
    if (target.role === "owner") throw new ActionError("The owner can't be removed.");
    const net = (await roomNets(roomId)).get(userId) ?? 0;
    if (net !== 0) {
      throw new ActionError(
        `This member has an outstanding balance of ${formatNpr(net, { sign: true })}. Settle up before removing to keep history consistent.`,
      );
    }
    await db.membership.update({
      where: { roomId_userId: { roomId, userId } },
      data: { active: false },
    });
    revalidateApp();
    return null;
  });
}

export async function leaveRoomAction(roomId: string): Promise<ActionResult<null>> {
  return run(async () => {
    const { user, room, role } = await requireMember(roomId, { allowArchived: true });
    const others = room.memberships.filter((m) => m.active && m.userId !== user.id);
    if (role === "owner" && others.length > 0) {
      throw new ActionError("Transfer ownership to another member before leaving.");
    }
    const net = (await roomNets(roomId)).get(user.id) ?? 0;
    if (net !== 0) {
      throw new ActionError(
        `Settle your balance of ${formatNpr(net, { sign: true })} before leaving.`,
      );
    }
    await db.membership.update({
      where: { roomId_userId: { roomId, userId: user.id } },
      data: { active: false },
    });
    // A room with nobody left can't be reached again, so close it.
    if (others.length === 0 && !room.archivedAt) {
      await db.room.update({ where: { id: roomId }, data: { archivedAt: new Date() } });
    }
    revalidateApp();
    return null;
  });
}

export async function setRoomArchivedAction(
  roomId: string,
  archived: boolean,
): Promise<ActionResult<null>> {
  return run(async () => {
    const { role } = await requireMember(roomId, { allowArchived: true });
    if (role !== "owner") throw new ActionError("Only the owner can archive this room.");
    await db.room.update({
      where: { id: roomId },
      data: { archivedAt: archived ? new Date() : null },
    });
    revalidateApp();
    return null;
  });
}

/**
 * Records an invitation for an email address and emails the invitee. The
 * invitation shows on their Rooms page once they sign in with that address,
 * so it still works when the email can't be sent (`emailed: false`).
 */
export async function inviteByEmailAction(
  roomId: string,
  input: { email: string },
): Promise<ActionResult<{ email: string; emailed: boolean }>> {
  return run(async () => {
    const { user, room } = await requireMember(roomId, { manage: true });
    const email = parseEmail(input?.email);
    await rateLimit("invite", { perIp: 40, perSubject: 20, subject: user.id, minutes: 60 });
    const existing = await db.user.findUnique({ where: { email } });
    if (existing && room.memberships.some((m) => m.userId === existing.id && m.active)) {
      throw new ActionError("That person is already a member of this room.");
    }
    const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);
    await db.invite.upsert({
      where: { roomId_email: { roomId, email } },
      create: { roomId, email, invitedById: user.id, expiresAt },
      update: { invitedById: user.id, expiresAt, acceptedAt: null },
    });
    const emailed = await sendMail({
      to: email,
      subject: `${user.name} invited you to “${room.name}” on RoomKhata`,
      text: [
        `${user.name} invited you to join the room “${room.name}” on RoomKhata, where flatmates track and split shared expenses.`,
        "",
        existing
          ? `Log in and open Rooms to accept: ${appUrl()}/rooms`
          : `Create an account with this email address (${email}), confirm it from the email we send you, then open Rooms to accept: ${appUrl()}/register`,
        "",
        `You can also join with the invite code ${room.inviteCode}.`,
        "",
        `This invitation expires in ${INVITE_DAYS} days. If you don't know ${user.name}, you can ignore this email.`,
      ].join("\n"),
    });
    revalidateApp();
    return { email, emailed };
  });
}

export async function respondToInviteAction(
  inviteId: string,
  accept: boolean,
): Promise<ActionResult<{ roomName: string }>> {
  return run(async () => {
    const user = await requireUser();
    const invite = await db.invite.findUnique({ where: { id: inviteId }, include: { room: true } });
    // The invite must be addressed to this user's own email.
    if (!invite || invite.email !== user.email || invite.acceptedAt) {
      throw new ActionError("Invitation not found.");
    }
    // Without this, anyone could register someone else's address and take their invite.
    if (!user.emailVerified) {
      throw new ActionError("Verify your email address before responding to invitations.");
    }
    if (!accept) {
      await db.invite.delete({ where: { id: inviteId } });
      revalidateApp();
      return { roomName: invite.room.name };
    }
    if (invite.expiresAt < new Date() || invite.room.archivedAt) {
      throw new ActionError("This invitation has expired.");
    }
    await addMember(invite.roomId, user.id);
    await db.invite.update({ where: { id: inviteId }, data: { acceptedAt: new Date() } });
    await selectRoom(invite.roomId);
    revalidateApp();
    return { roomName: invite.room.name };
  });
}

/** Withdraw an invitation that hasn't been accepted yet. */
export async function cancelInviteAction(inviteId: string): Promise<ActionResult<null>> {
  return run(async () => {
    const invite = await db.invite.findUnique({ where: { id: str(inviteId, "Invitation", 60) } });
    if (!invite || invite.acceptedAt) throw new ActionError("Invitation not found.");
    await requireMember(invite.roomId, { manage: true });
    await db.invite.delete({ where: { id: invite.id } });
    revalidateApp();
    return null;
  });
}
