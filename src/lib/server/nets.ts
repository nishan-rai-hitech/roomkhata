import "server-only";
import { db } from "./db";

/**
 * Net balance per user in a room, same sign convention as lib/balances.ts
 * (net > 0 creditor, net < 0 debtor). Used by server-side guards such as
 * "can't leave with an outstanding balance".
 */
export async function roomNets(roomId: string): Promise<Map<string, number>> {
  const [expenses, settlements] = await Promise.all([
    db.expense.findMany({
      where: { roomId, deletedAt: null, isPersonal: false },
      include: { shares: true },
    }),
    db.settlement.findMany({ where: { roomId } }),
  ]);
  const nets = new Map<string, number>();
  const add = (userId: string, delta: number) => nets.set(userId, (nets.get(userId) ?? 0) + delta);

  for (const e of expenses) {
    add(e.payerId, e.amount);
    for (const s of e.shares) add(s.userId, -s.amount);
  }
  for (const s of settlements) {
    add(s.fromUserId, s.amount);
    add(s.toUserId, -s.amount);
  }
  return nets;
}
