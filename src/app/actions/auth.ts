"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import type { ActionResult } from "@/lib/action-result";
import { AVATAR_COLORS } from "@/lib/constants";
import { ActionError, email as parseEmail, revalidateApp, run, str } from "@/lib/server/action";
import { db } from "@/lib/server/db";
import { appUrl, sendMail } from "@/lib/server/mail";
import { hashPassword, hashToken, newToken, verifyPassword } from "@/lib/server/password";
import { rateLimit } from "@/lib/server/rate-limit";
import { createSession, destroySession, requireUser } from "@/lib/server/session";
import { sendVerificationEmail } from "@/lib/server/verify-email";

const RESET_MINUTES = 30;

function parsePassword(value: unknown): string {
  if (typeof value !== "string" || value.length < 8) {
    throw new ActionError("Password must be at least 8 characters.");
  }
  if (value.length > 200) throw new ActionError("Password is too long.");
  return value;
}

export async function registerAction(input: {
  name: string;
  email: string;
  password: string;
}): Promise<ActionResult<null>> {
  const result = await run(async () => {
    const name = str(input?.name, "Full name", 80);
    const email = parseEmail(input?.email);
    const password = parsePassword(input?.password);
    await rateLimit("register", { perIp: 5, minutes: 60 });

    if (await db.user.findUnique({ where: { email } })) {
      throw new ActionError("An account with this email already exists.");
    }
    const count = await db.user.count();
    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
        avatarColor: AVATAR_COLORS[count % AVATAR_COLORS.length],
      },
    });
    await sendVerificationEmail(user);
    await createSession(user.id);
    return null;
  });
  if (result.ok) redirect("/dashboard");
  return result;
}

export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<ActionResult<null>> {
  const result = await run(async () => {
    const email = parseEmail(input?.email);
    const password = typeof input?.password === "string" ? input.password : "";
    await rateLimit("login", { perIp: 20, perSubject: 8, subject: email, minutes: 15 });
    const user = await db.user.findUnique({ where: { email } });
    const valid =
      !!user && !user.deletedAt && (await verifyPassword(password, user.passwordHash));
    // Same message for unknown email and wrong password, so accounts can't be probed.
    if (!user || !valid) throw new ActionError("Incorrect email or password.");
    await createSession(user.id);
    return null;
  });
  if (result.ok) redirect("/dashboard");
  return result;
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

/**
 * Always reports success so the form can't be used to discover accounts.
 * The link is emailed after the response is sent, so the reply takes the same
 * time whether or not the account exists. Without SMTP (or if the send fails)
 * the link is printed to the server log instead.
 */
export async function requestPasswordResetAction(input: {
  email: string;
}): Promise<ActionResult<null>> {
  return run(async () => {
    const email = parseEmail(input?.email);
    await rateLimit("reset-request", { perIp: 10, perSubject: 3, subject: email, minutes: 15 });
    const user = await db.user.findUnique({ where: { email } });
    if (user && !user.deletedAt) {
      const token = newToken();
      await db.passwordResetToken.create({
        data: {
          tokenHash: hashToken(token),
          userId: user.id,
          expiresAt: new Date(Date.now() + RESET_MINUTES * 60 * 1000),
        },
      });
      const link = `${appUrl()}/reset-password?token=${token}`;
      const name = user.name;
      after(async () => {
        const sent = await sendMail({
          to: email,
          subject: "Reset your RoomKhata password",
          text: [
            `Hi ${name},`,
            "",
            "Someone asked to reset the password for your RoomKhata account. Open this link to choose a new one:",
            "",
            link,
            "",
            `The link works once and expires in ${RESET_MINUTES} minutes. If you didn't ask for this, you can ignore this email — your password stays the same.`,
          ].join("\n"),
        });
        if (!sent) {
          console.log(
            `[RoomKhata] Password reset link for ${email} (valid ${RESET_MINUTES} min):\n  ${link}`,
          );
        }
      });
    }
    return null;
  });
}

export async function resetPasswordAction(input: {
  token: string;
  password: string;
}): Promise<ActionResult<null>> {
  return run(async () => {
    const token = str(input?.token, "Reset token", 200);
    const password = parsePassword(input?.password);
    await rateLimit("reset", { perIp: 20, minutes: 15 });
    const row = await db.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      throw new ActionError("This reset link is invalid or has expired. Request a new one.");
    }
    await db.$transaction([
      db.user.update({
        where: { id: row.userId },
        data: { passwordHash: await hashPassword(password) },
      }),
      db.passwordResetToken.update({
        where: { tokenHash: row.tokenHash },
        data: { usedAt: new Date() },
      }),
      // Sign out everywhere: whoever had the old password loses access.
      db.session.deleteMany({ where: { userId: row.userId } }),
    ]);
    return null;
  });
}

export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ActionResult<null>> {
  return run(async () => {
    const user = await requireUser();
    const current = typeof input?.currentPassword === "string" ? input.currentPassword : "";
    const next = parsePassword(input?.newPassword);
    await rateLimit("change-password", { perIp: 20, perSubject: 8, subject: user.id, minutes: 15 });
    const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await verifyPassword(current, row.passwordHash))) {
      throw new ActionError("Your current password is incorrect.");
    }
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(next) },
    });
    // Drop every session, then start a fresh one for this device.
    await db.session.deleteMany({ where: { userId: user.id } });
    await createSession(user.id);
    return null;
  });
}

/** Confirms the address a verification link was sent to. Works signed in or out. */
export async function verifyEmailAction(input: { token: string }): Promise<ActionResult<null>> {
  return run(async () => {
    const token = str(input?.token, "Verification token", 200);
    await rateLimit("verify-email", { perIp: 30, minutes: 15 });
    const row = await db.emailVerificationToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    // The link must be for the address the account uses right now.
    if (!row || row.expiresAt < new Date() || row.user.deletedAt || row.user.email !== row.email) {
      throw new ActionError(
        "This verification link is invalid or has expired. Log in and request a new one.",
      );
    }
    await db.$transaction([
      db.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: new Date() } }),
      db.emailVerificationToken.deleteMany({ where: { userId: row.userId } }),
    ]);
    revalidateApp();
    return null;
  });
}

export async function resendVerificationAction(): Promise<ActionResult<{ email: string }>> {
  return run(async () => {
    const user = await requireUser();
    if (user.emailVerified) throw new ActionError("Your email is already verified.");
    await rateLimit("verify-resend", { perIp: 10, perSubject: 3, subject: user.id, minutes: 15 });
    await sendVerificationEmail(user);
    return { email: user.email };
  });
}
