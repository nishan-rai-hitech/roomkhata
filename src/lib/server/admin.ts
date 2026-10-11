import "server-only";
import { db } from "./db";

const DAY = 24 * 60 * 60 * 1000;

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  joinedAt: string;
  emailVerified: boolean;
  rooms: number;
  expensesAdded: number;
  /** Most recent sign-in, if any session is still on record. */
  lastLoginAt: string | null;
}

export interface AdminStats {
  users: number;
  newUsers7d: number;
  newUsers30d: number;
  /** Signed in during the last 30 days. */
  activeUsers30d: number;
  verifiedUsers: number;
  rooms: number;
  expenses: number;
  /** Total of all recorded expenses, in paisa. */
  expenseVolume: number;
  settlements: number;
  userRows: AdminUserRow[];
}

/**
 * Platform-wide usage numbers. Caller must have checked `user.isAdmin`.
 * Deliberately limited to accounts and counts: no room names, expense titles
 * or anything else people wrote inside their rooms.
 */
export async function getAdminStats(): Promise<AdminStats> {
  const now = Date.now();
  const [users, expensesByUser, rooms, expenseTotals, settlements] = await Promise.all([
    db.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        avatarColor: true,
        createdAt: true,
        emailVerifiedAt: true,
        memberships: { where: { active: true }, select: { roomId: true } },
        sessions: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
    }),
    db.expense.groupBy({ by: ["createdById"], where: { deletedAt: null }, _count: true }),
    db.room.count({ where: { archivedAt: null } }),
    db.expense.aggregate({ where: { deletedAt: null }, _count: true, _sum: { amount: true } }),
    db.settlement.count(),
  ]);

  const added = new Map(expensesByUser.map((e) => [e.createdById, e._count]));
  const userRows: AdminUserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    avatarColor: u.avatarColor,
    joinedAt: u.createdAt.toISOString(),
    emailVerified: u.emailVerifiedAt !== null,
    rooms: u.memberships.length,
    expensesAdded: added.get(u.id) ?? 0,
    lastLoginAt: u.sessions[0]?.createdAt.toISOString() ?? null,
  }));

  const joinedWithin = (days: number) =>
    users.filter((u) => now - u.createdAt.getTime() <= days * DAY).length;

  return {
    users: users.length,
    newUsers7d: joinedWithin(7),
    newUsers30d: joinedWithin(30),
    activeUsers30d: users.filter(
      (u) => u.sessions[0] && now - u.sessions[0].createdAt.getTime() <= 30 * DAY,
    ).length,
    verifiedUsers: users.filter((u) => u.emailVerifiedAt !== null).length,
    rooms,
    expenses: expenseTotals._count,
    expenseVolume: expenseTotals._sum.amount ?? 0,
    settlements,
    userRows,
  };
}
