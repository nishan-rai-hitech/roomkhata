import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import type {
  Expense,
  PendingInvite,
  Room,
  RoomInvite,
  RoomRole,
  Settlement,
  SplitMethod,
} from "@/lib/types";
import { db } from "./db";
import { ROOM_COOKIE, requireUser, type SessionUser } from "./session";

/**
 * Data access layer. Every read here is scoped to the signed-in user: rooms are
 * only returned through the user's own active membership.
 */

const roomInclude = {
  memberships: { include: { user: true }, orderBy: { joinedAt: "asc" } },
} satisfies Prisma.RoomInclude;

type RoomRow = Prisma.RoomGetPayload<{ include: typeof roomInclude }>;
type ExpenseRow = Prisma.ExpenseGetPayload<{ include: { shares: true } }>;
type SettlementRow = Prisma.SettlementGetPayload<object>;

function toRoom(r: RoomRow): Room {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    currency: "NPR",
    timezone: r.timezone,
    inviteCode: r.inviteCode,
    createdAt: r.createdAt.toISOString(),
    archived: r.archivedAt !== null,
    members: r.memberships.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      avatarColor: m.user.avatarColor,
      role: m.role as RoomRole,
      joinedAt: m.joinedAt.toISOString(),
      active: m.active,
    })),
  };
}

function toExpense(e: ExpenseRow): Expense {
  return {
    id: e.id,
    roomId: e.roomId,
    title: e.title,
    category: e.category,
    amount: e.amount,
    payerId: e.payerId,
    createdById: e.createdById,
    date: e.date,
    splitMethod: e.splitMethod as SplitMethod,
    shares: e.shares.map((s) => ({ userId: s.userId, amount: s.amount })),
    isPersonal: e.isPersonal,
    note: e.note ?? undefined,
    createdAt: e.createdAt.toISOString(),
  };
}

function toSettlement(s: SettlementRow): Settlement {
  return {
    id: s.id,
    roomId: s.roomId,
    fromUserId: s.fromUserId,
    toUserId: s.toUserId,
    amount: s.amount,
    date: s.date,
    method: s.method as Settlement["method"],
    note: s.note ?? undefined,
    createdAt: s.createdAt.toISOString(),
  };
}

export interface AppContext {
  user: SessionUser;
  /** Rooms the user is an active member of. */
  rooms: Room[];
  /** The selected room (cookie), falling back to the first non-archived one. */
  room: Room | null;
}

export const getAppContext = cache(async (): Promise<AppContext> => {
  const user = await requireUser();
  const rows = await db.room.findMany({
    where: { memberships: { some: { userId: user.id, active: true } } },
    include: roomInclude,
    orderBy: { createdAt: "asc" },
  });
  const rooms = rows.map(toRoom);
  const selectedId = (await cookies()).get(ROOM_COOKIE)?.value;
  const room =
    rooms.find((r) => r.id === selectedId) ?? rooms.find((r) => !r.archived) ?? rooms[0] ?? null;
  return { user, rooms, room };
});

/** A single room, only if the signed-in user is an active member. */
export async function getRoomForUser(roomId: string): Promise<Room | null> {
  const { rooms } = await getAppContext();
  return rooms.find((r) => r.id === roomId) ?? null;
}

export interface Ledger {
  expenses: Expense[];
  settlements: Settlement[];
}

/** Caller must have already checked membership (use a room from getAppContext). */
async function loadLedgers(roomIds: string[]): Promise<Map<string, Ledger>> {
  const [expenses, settlements] = await Promise.all([
    db.expense.findMany({
      where: { roomId: { in: roomIds }, deletedAt: null },
      include: { shares: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    db.settlement.findMany({
      where: { roomId: { in: roomIds } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
  ]);
  const out = new Map<string, Ledger>(
    roomIds.map((id) => [id, { expenses: [], settlements: [] }]),
  );
  for (const e of expenses) out.get(e.roomId)?.expenses.push(toExpense(e));
  for (const s of settlements) out.get(s.roomId)?.settlements.push(toSettlement(s));
  return out;
}

export async function getLedger(room: Room): Promise<Ledger> {
  return (await loadLedgers([room.id])).get(room.id)!;
}

export async function getLedgers(rooms: Room[]): Promise<Map<string, Ledger>> {
  return loadLedgers(rooms.map((r) => r.id));
}

/** An expense in one of the user's rooms, plus that room. */
export async function getExpenseForUser(
  id: string,
): Promise<{ expense: Expense; room: Room } | null> {
  const row = await db.expense.findFirst({
    where: { id, deletedAt: null },
    include: { shares: true },
  });
  if (!row) return null;
  const room = await getRoomForUser(row.roomId);
  if (!room) return null;
  return { expense: toExpense(row), room };
}

export async function getPendingInvites(): Promise<PendingInvite[]> {
  const { user, rooms } = await getAppContext();
  // Invitations are addressed to an email, so they only show once it's proven.
  if (!user.emailVerified) return [];
  const invites = await db.invite.findMany({
    where: {
      email: user.email,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
      roomId: { notIn: rooms.map((r) => r.id) },
      room: { archivedAt: null },
    },
    include: { room: true },
    orderBy: { createdAt: "desc" },
  });
  const inviters = await db.user.findMany({
    where: { id: { in: invites.map((i) => i.invitedById) } },
    select: { id: true, name: true },
  });
  return invites.map((i) => ({
    id: i.id,
    roomId: i.roomId,
    roomName: i.room.name,
    invitedByName: inviters.find((u) => u.id === i.invitedById)?.name ?? "A member",
    expiresAt: i.expiresAt.toISOString(),
  }));
}

/** Invitations to a room that are still waiting for an answer. Caller checks who may see them. */
export async function getRoomInvites(roomId: string): Promise<RoomInvite[]> {
  const invites = await db.invite.findMany({
    where: { roomId, acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  return invites.map((i) => ({ id: i.id, email: i.email, expiresAt: i.expiresAt.toISOString() }));
}

export interface UserSettings {
  language: string;
  notifyExpense: boolean;
  notifySettlement: boolean;
  notifyMonthly: boolean;
  notifyReminders: boolean;
}

export async function getUserSettings(): Promise<UserSettings> {
  const user = await requireUser();
  return db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      language: true,
      notifyExpense: true,
      notifySettlement: true,
      notifyMonthly: true,
      notifyReminders: true,
    },
  });
}

/** Today's date (YYYY-MM-DD) in the given IANA timezone. */
export function todayIn(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
