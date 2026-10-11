import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { User } from "@/lib/types";
import { db } from "./db";
import { hashToken, newToken } from "./password";

export const SESSION_COOKIE = "rk_session";
export const ROOM_COOKIE = "rk_room";

/** Browsers drop `Secure` cookies on plain HTTP, so they follow the public address. */
export const SECURE_COOKIES = (process.env.APP_URL ?? "").startsWith("https://");

const SESSION_DAYS = 30;

/** The signed-in user plus account state that never leaves the server layer by default. */
export interface SessionUser extends User {
  emailVerified: boolean;
  /** Listed in ADMIN_EMAILS and verified: may open the platform admin page. */
  isAdmin: boolean;
}

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export async function createSession(userId: string): Promise<void> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: SECURE_COOKIES,
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  store.delete(SESSION_COOKIE);
  store.delete(ROOM_COOKIE);
}

/** The signed-in user, or null. Deduplicated per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || session.user.deletedAt) return null;
  const { id, name, email, avatarColor } = session.user;
  const emailVerified = session.user.emailVerifiedAt !== null;
  // An unverified address proves nothing, so it never grants admin.
  return { id, name, email, avatarColor, emailVerified, isAdmin: emailVerified && ADMIN_EMAILS.has(email) };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
