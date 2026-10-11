"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { formatNpr } from "@/lib/money";
import {
  ActionError,
  email as parseEmail,
  oneOf,
  revalidateApp,
  run,
  str,
} from "@/lib/server/action";
import { db } from "@/lib/server/db";
import { roomNets } from "@/lib/server/nets";
import { verifyPassword } from "@/lib/server/password";
import { destroySession, requireUser } from "@/lib/server/session";

export async function updateProfileAction(input: {
  name: string;
  email: string;
}): Promise<ActionResult<null>> {
  return run(async () => {
    const user = await requireUser();
    const name = str(input?.name, "Full name", 80);
    const email = parseEmail(input?.email);
    if (email !== user.email && (await db.user.findUnique({ where: { email } }))) {
      throw new ActionError("Another account already uses that email.");
    }
    await db.user.update({ where: { id: user.id }, data: { name, email } });
    revalidateApp();
    return null;
  });
}

export interface PreferencesInput {
  language: string;
  notifyExpense: boolean;
  notifySettlement: boolean;
  notifyMonthly: boolean;
  notifyReminders: boolean;
}

export async function updatePreferencesAction(
  input: PreferencesInput,
): Promise<ActionResult<null>> {
  return run(async () => {
    const user = await requireUser();
    await db.user.update({
      where: { id: user.id },
      data: {
        language: oneOf(input?.language, ["en", "ne"] as const, "Language"),
        notifyExpense: input.notifyExpense === true,
        notifySettlement: input.notifySettlement === true,
        notifyMonthly: input.notifyMonthly === true,
        notifyReminders: input.notifyReminders === true,
      },
    });
    revalidateApp();
    return null;
  });
}

/**
 * Deleting an account must not break other people's ledgers, so the user row
 * is anonymized rather than removed: past expenses keep a "Deleted user" name.
 */
export async function deleteAccountAction(input: {
  password: string;
}): Promise<ActionResult<null>> {
  const result = await run(async () => {
    const user = await requireUser();
    const row = await db.user.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        memberships: {
          where: { active: true },
          include: { room: { include: { memberships: { where: { active: true } } } } },
        },
      },
    });
    const password = typeof input?.password === "string" ? input.password : "";
    if (!(await verifyPassword(password, row.passwordHash))) {
      throw new ActionError("Your password is incorrect.");
    }

    for (const m of row.memberships) {
      if (m.role === "owner" && m.room.memberships.length > 1) {
        throw new ActionError(
          `Transfer ownership of “${m.room.name}” before deleting your account.`,
        );
      }
      const net = (await roomNets(m.roomId)).get(user.id) ?? 0;
      if (net !== 0) {
        throw new ActionError(
          `Settle your balance of ${formatNpr(net, { sign: true })} in “${m.room.name}” first.`,
        );
      }
    }

    // Rooms where the user is the only member have nobody left to use them.
    const soloRoomIds = row.memberships
      .filter((m) => m.room.memberships.length === 1)
      .map((m) => m.roomId);

    await db.$transaction([
      db.room.updateMany({
        where: { id: { in: soloRoomIds }, archivedAt: null },
        data: { archivedAt: new Date() },
      }),
      db.membership.updateMany({ where: { userId: user.id }, data: { active: false } }),
      db.invite.deleteMany({ where: { email: user.email } }),
      db.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      db.user.update({
        where: { id: user.id },
        data: {
          name: "Deleted user",
          email: `deleted-${user.id}@deleted.invalid`,
          passwordHash: "",
          deletedAt: new Date(),
        },
      }),
    ]);
    await destroySession();
    await db.session.deleteMany({ where: { userId: user.id } });
    return null;
  });
  if (result.ok) redirect("/login");
  return result;
}
