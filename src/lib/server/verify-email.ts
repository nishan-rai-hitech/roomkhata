import "server-only";
import { after } from "next/server";
import { db } from "./db";
import { appUrl, sendMail } from "./mail";
import { hashToken, newToken } from "./password";

const VERIFY_HOURS = 24;

/**
 * Email the user a link that proves they own their address. Sent after the
 * response, like the reset link; without SMTP (or if the send fails) the link
 * is printed to the server log instead.
 */
export async function sendVerificationEmail(user: {
  id: string;
  name: string;
  email: string;
}): Promise<void> {
  const token = newToken();
  await db.$transaction([
    // Only the newest link works.
    db.emailVerificationToken.deleteMany({ where: { userId: user.id } }),
    db.emailVerificationToken.create({
      data: {
        tokenHash: hashToken(token),
        userId: user.id,
        email: user.email,
        expiresAt: new Date(Date.now() + VERIFY_HOURS * 60 * 60 * 1000),
      },
    }),
  ]);
  const link = `${appUrl()}/verify-email?token=${token}`;
  after(async () => {
    const sent = await sendMail({
      to: user.email,
      subject: "Confirm your email for RoomKhata",
      text: [
        `Hi ${user.name},`,
        "",
        "Open this link to confirm that this email address is yours:",
        "",
        link,
        "",
        `The link expires in ${VERIFY_HOURS} hours. If you didn't create a RoomKhata account, you can ignore this email.`,
      ].join("\n"),
    });
    if (!sent) {
      console.log(
        `[RoomKhata] Email verification link for ${user.email} (valid ${VERIFY_HOURS} h):\n  ${link}`,
      );
    }
  });
}
