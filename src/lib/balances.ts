import type { Expense, Settlement } from "./types";
import type { Paisa } from "./money";

/**
 * Authoritative balance computation for a room — RoomKhata.
 *
 * SIGN CONVENTION (documented, per spec §2):
 *   net > 0  → the member is a CREDITOR (others owe them / they are owed).
 *   net < 0  → the member is a DEBTOR  (they owe the group).
 *   net = 0  → settled up.
 *
 *   net = paid − assignedShare + settlementsPaid − settlementsReceived
 *
 * Personal expenses never affect shared balances and are excluded here.
 * The sum of all members' net balances is always exactly zero (integer paisa).
 */

export interface MemberBalance {
  userId: string;
  paid: Paisa; // total paid for SHARED expenses
  assignedShare: Paisa; // total assigned share of SHARED expenses
  settlementsPaid: Paisa;
  settlementsReceived: Paisa;
  net: Paisa; // see sign convention above
}

export function computeBalances(
  memberIds: string[],
  expenses: Expense[],
  settlements: Settlement[],
): MemberBalance[] {
  const base = new Map<string, MemberBalance>(
    memberIds.map((id) => [
      id,
      { userId: id, paid: 0, assignedShare: 0, settlementsPaid: 0, settlementsReceived: 0, net: 0 },
    ]),
  );

  for (const e of expenses) {
    if (e.isPersonal) continue; // personal spending is excluded from shared balances
    const payer = base.get(e.payerId);
    if (payer) payer.paid += e.amount;
    for (const s of e.shares) {
      const m = base.get(s.userId);
      if (m) m.assignedShare += s.amount;
    }
  }

  for (const s of settlements) {
    const from = base.get(s.fromUserId);
    const to = base.get(s.toUserId);
    if (from) from.settlementsPaid += s.amount;
    if (to) to.settlementsReceived += s.amount;
  }

  for (const m of base.values()) {
    m.net = m.paid - m.assignedShare + m.settlementsPaid - m.settlementsReceived;
  }

  return [...base.values()];
}

/** Reconciliation guard — the sum of all nets must be zero. */
export function balancesReconcile(balances: MemberBalance[]): boolean {
  return balances.reduce((a, b) => a + b.net, 0) === 0;
}

export interface SettlementSuggestion {
  fromUserId: string; // debtor
  toUserId: string; // creditor
  amount: Paisa;
}

/**
 * Deterministic minimal-transfer settlement suggestions.
 * Greedy largest-debtor ↔ largest-creditor matching. Pure function:
 * it NEVER changes balances — suggestions are realized only when a
 * settlement is explicitly recorded.
 */
export function suggestSettlements(balances: MemberBalance[]): SettlementSuggestion[] {
  const debtors = balances
    .filter((b) => b.net < 0)
    .map((b) => ({ id: b.userId, amt: -b.net }))
    .sort((a, b) => b.amt - a.amt || a.id.localeCompare(b.id));
  const creditors = balances
    .filter((b) => b.net > 0)
    .map((b) => ({ id: b.userId, amt: b.net }))
    .sort((a, b) => b.amt - a.amt || a.id.localeCompare(b.id));

  const out: SettlementSuggestion[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    if (pay > 0) {
      out.push({ fromUserId: debtors[i].id, toUserId: creditors[j].id, amount: pay });
    }
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt === 0) i++;
    if (creditors[j].amt === 0) j++;
  }
  return out;
}
