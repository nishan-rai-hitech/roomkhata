"use server";

import type { ActionResult } from "@/lib/action-result";
import { CATEGORIES, SETTLEMENT_METHODS } from "@/lib/constants";
import {
  ActionError,
  isoDate,
  oneOf,
  optStr,
  paisa,
  requireMember,
  revalidateApp,
  run,
  str,
} from "@/lib/server/action";
import { getAppContext } from "@/lib/server/data";
import { db } from "@/lib/server/db";
import type { SplitMethod } from "@/lib/types";

export interface ExpenseInput {
  title: string;
  category: string;
  amount: number; // paisa
  date: string; // YYYY-MM-DD
  payerId: string;
  isPersonal: boolean;
  splitMethod: SplitMethod;
  shares: { userId: string; amount: number }[];
  note?: string;
}

const SPLITS = ["equal", "shares", "exact", "percent"] as const;

/**
 * Validate an expense against the room. `allowedIds` is who may be a payer or
 * participant: active members, plus (when editing) anyone already on the record.
 */
function parseExpense(input: ExpenseInput, allowedIds: Set<string>) {
  const title = str(input?.title, "Title", 120);
  const category = oneOf(input?.category, CATEGORIES, "Category");
  const amount = paisa(input?.amount, "Amount");
  const date = isoDate(input?.date);
  const isPersonal = input?.isPersonal === true;
  const splitMethod = isPersonal ? "equal" : oneOf(input?.splitMethod, SPLITS, "Split method");
  const note = optStr(input?.note, "Note");

  if (typeof input?.payerId !== "string" || !allowedIds.has(input.payerId)) {
    throw new ActionError("The payer must be a member of this room.");
  }
  const payerId = input.payerId;

  // A personal expense is charged to the payer only, whatever the client sent.
  const rawShares = isPersonal ? [{ userId: payerId, amount }] : input?.shares;
  if (!Array.isArray(rawShares) || rawShares.length === 0 || rawShares.length > 200) {
    throw new ActionError("Select at least one person to split with.");
  }
  const seen = new Set<string>();
  const shares = rawShares.map((s) => {
    if (typeof s?.userId !== "string" || !allowedIds.has(s.userId)) {
      throw new ActionError("Everyone in the split must be a member of this room.");
    }
    if (seen.has(s.userId)) throw new ActionError("A member appears twice in the split.");
    seen.add(s.userId);
    if (!Number.isInteger(s.amount) || s.amount < 0) {
      throw new ActionError("Each share must be zero or more.");
    }
    return { userId: s.userId, amount: s.amount as number };
  });
  if (shares.reduce((a, s) => a + s.amount, 0) !== amount) {
    throw new ActionError("The shares must add up to the total exactly.");
  }

  return { title, category, amount, date, payerId, isPersonal, splitMethod, note, shares };
}

export async function createExpenseAction(
  input: ExpenseInput,
): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const { room: current } = await getAppContext();
    if (!current) throw new ActionError("Create or join a room first.");
    const { user, room } = await requireMember(current.id);
    const active = new Set(room.memberships.filter((m) => m.active).map((m) => m.userId));
    const { shares, ...data } = parseExpense(input, active);

    const expense = await db.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: { ...data, roomId: room.id, createdById: user.id, shares: { create: shares } },
      });
      await tx.auditLog.create({
        data: {
          roomId: room.id,
          actorId: user.id,
          action: "expense.create",
          entityType: "expense",
          entityId: created.id,
          data: JSON.stringify({ ...data, shares }),
        },
      });
      return created;
    });
    revalidateApp();
    return { id: expense.id };
  });
}

/** The creator, the payer, or a room owner/admin may change an expense. */
async function requireExpenseEditor(id: string) {
  const existing = await db.expense.findFirst({
    where: { id: typeof id === "string" ? id : "", deletedAt: null },
    include: { shares: true },
  });
  if (!existing) throw new ActionError("Expense not found.");
  const ctx = await requireMember(existing.roomId);
  const canEdit =
    existing.createdById === ctx.user.id ||
    existing.payerId === ctx.user.id ||
    ctx.role !== "member";
  if (!canEdit) {
    throw new ActionError("Only the person who added or paid it, or a room admin, can change this.");
  }
  return { existing, ...ctx };
}

export async function updateExpenseAction(
  id: string,
  input: ExpenseInput,
): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const { existing, user, room } = await requireExpenseEditor(id);
    const allowed = new Set([
      ...room.memberships.filter((m) => m.active).map((m) => m.userId),
      existing.payerId,
      ...existing.shares.map((s) => s.userId),
    ]);
    const { shares, ...data } = parseExpense(input, allowed);

    await db.$transaction([
      db.expenseShare.deleteMany({ where: { expenseId: existing.id } }),
      db.expense.update({
        where: { id: existing.id },
        data: { ...data, shares: { create: shares } },
      }),
      // Keep the original values alongside the new ones.
      db.auditLog.create({
        data: {
          roomId: room.id,
          actorId: user.id,
          action: "expense.update",
          entityType: "expense",
          entityId: existing.id,
          data: JSON.stringify({ before: existing, after: { ...data, shares } }),
        },
      }),
    ]);
    revalidateApp();
    return { id: existing.id };
  });
}

export async function deleteExpenseAction(
  id: string,
  reason: string,
): Promise<ActionResult<null>> {
  return run(async () => {
    const deleteReason = str(reason, "Reason", 200);
    const { existing, user, room } = await requireExpenseEditor(id);
    // Soft delete: the record stays, with who removed it and why.
    await db.$transaction([
      db.expense.update({
        where: { id: existing.id },
        data: { deletedAt: new Date(), deletedById: user.id, deleteReason },
      }),
      db.auditLog.create({
        data: {
          roomId: room.id,
          actorId: user.id,
          action: "expense.delete",
          entityType: "expense",
          entityId: existing.id,
          data: JSON.stringify({ reason: deleteReason, record: existing }),
        },
      }),
    ]);
    revalidateApp();
    return null;
  });
}

export interface SettlementInput {
  fromUserId: string;
  toUserId: string;
  amount: number; // paisa
  date: string;
  method: (typeof SETTLEMENT_METHODS)[number];
  note?: string;
}

export async function recordSettlementAction(
  input: SettlementInput,
): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const { room: current } = await getAppContext();
    if (!current) throw new ActionError("Create or join a room first.");
    const { user, room, role } = await requireMember(current.id);
    const memberIds = new Set(room.memberships.map((m) => m.userId));

    const { fromUserId, toUserId } = input ?? {};
    if (
      typeof fromUserId !== "string" ||
      typeof toUserId !== "string" ||
      !memberIds.has(fromUserId) ||
      !memberIds.has(toUserId)
    ) {
      throw new ActionError("Both people must be members of this room.");
    }
    if (fromUserId === toUserId) throw new ActionError("Payer and receiver must be different.");
    // A regular member can only record payments they were part of.
    if (role === "member" && fromUserId !== user.id && toUserId !== user.id) {
      throw new ActionError("You can only record payments you made or received.");
    }
    const data = {
      roomId: room.id,
      fromUserId,
      toUserId,
      amount: paisa(input.amount, "Amount"),
      date: isoDate(input.date),
      method: oneOf(input.method, SETTLEMENT_METHODS, "Method"),
      note: optStr(input.note, "Note", 200),
      createdById: user.id,
    };

    const settlement = await db.$transaction(async (tx) => {
      const created = await tx.settlement.create({ data });
      await tx.auditLog.create({
        data: {
          roomId: room.id,
          actorId: user.id,
          action: "settlement.create",
          entityType: "settlement",
          entityId: created.id,
          data: JSON.stringify(data),
        },
      });
      return created;
    });
    revalidateApp();
    return { id: settlement.id };
  });
}
