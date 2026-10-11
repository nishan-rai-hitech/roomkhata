import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const { SMTP_PORT, SMTP_PASS } = process.env;
  const SMTP_HOST = process.env.SMTP_HOST?.trim();
  const SMTP_USER = process.env.SMTP_USER?.trim();
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  const port = Number(SMTP_PORT) || 465;
  transporter ??= nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

/**
 * Send a plain-text email. Returns false when SMTP isn't configured or the
 * send fails, so callers can fall back instead of failing the whole action.
 */
export async function sendMail(message: {
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) return false;
  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      ...message,
    });
    return true;
  } catch (err) {
    console.error(`[RoomKhata] Could not send email to ${message.to}:`, err);
    return false;
  }
}

/**
 * Base URL for links inside emails. Taken from configuration rather than the
 * request's Host header, which a caller could forge to poison a link.
 */
export function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}
