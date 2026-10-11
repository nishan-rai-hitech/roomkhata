import "server-only";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import type { RoomRole } from "@/lib/types";
import { db } from "./db";
import { requireUser } from "./session";

/** Thrown for expected, user-facing failures (validation, permissions). */
export class ActionError extends Error {}

/**
 * Run an action body, turning ActionError into a `{ ok: false }` result.
 * Anything else (including Next's redirect signal) is rethrown.
 */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof ActionError) return { ok: false, error: err.message };
    throw err;
  }
}

/** Purge the client cache so every screen reflects the mutation. */
export function revalidateApp(): void {
  revalidatePath("/", "layout");
}

/**
 * The signed-in user, once they've confirmed their email. The UI hides the app
 * from unverified accounts, but Server Actions are reachable by direct POST.
 */
export async function requireVerifiedUser() {
  const user = await requireUser();
  if (!user.emailVerified) {
    throw new ActionError("Confirm your email address to start using RoomKhata.");
  }
  return user;
}

/**
 * Authorize the signed-in user against a room. Server Actions are reachable by
 * direct POST, so every mutation re-checks membership here.
 */
export async function requireMember(
  roomId: string,
  opts: { manage?: boolean; allowArchived?: boolean } = {},
) {
  const user = await requireVerifiedUser();
  const room = await db.room.findUnique({
    where: { id: roomId },
    include: { memberships: true },
  });
  const membership = room?.memberships.find((m) => m.userId === user.id && m.active);
  if (!room || !membership) throw new ActionError("Room not found.");
  if (room.archivedAt && !opts.allowArchived) {
    throw new ActionError("This room is archived and read-only.");
  }
  const role = membership.role as RoomRole;
  if (opts.manage && role !== "owner" && role !== "admin") {
    throw new ActionError("Only the room owner or an admin can do that.");
  }
  return { user, room, membership, role };
}

// --- input validation helpers (action arguments are untrusted) ---

export function str(value: unknown, field: string, max = 200): string {
  if (typeof value !== "string") throw new ActionError(`${field} is required.`);
  const s = value.trim();
  if (!s) throw new ActionError(`${field} is required.`);
  if (s.length > max) throw new ActionError(`${field} is too long.`);
  return s;
}

export function optStr(value: unknown, field: string, max = 500): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new ActionError(`${field} is invalid.`);
  const s = value.trim();
  if (s.length > max) throw new ActionError(`${field} is too long.`);
  return s || null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function email(value: unknown): string {
  const s = str(value, "Email", 254).toLowerCase();
  if (!EMAIL_RE.test(s)) throw new ActionError("Enter a valid email address.");
  return s;
}

/** Positive integer paisa, capped to keep sums well inside safe integers. */
export function paisa(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new ActionError(`${field} must be greater than zero.`);
  }
  if (value > 100_000_000_00) throw new ActionError(`${field} is too large.`);
  return value;
}

export function isoDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ActionError("Enter a valid date.");
  }
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
    throw new ActionError("Enter a valid date.");
  }
  return value;
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new ActionError(`${field} is invalid.`);
  }
  return value as T;
}
