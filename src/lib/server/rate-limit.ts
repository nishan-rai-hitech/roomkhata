import "server-only";
import { headers } from "next/headers";
import { ActionError } from "./action";

/**
 * Fixed-window rate limiter held in memory. The app runs as a single Node
 * process, so this is enough to stop password guessing and signup/email spam;
 * counters reset when the process restarts.
 */
const windows = new Map<string, { count: number; resetAt: number }>();

const MINUTE = 60 * 1000;

function hit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  // Keep the map from growing without bound.
  if (windows.size > 10_000) {
    for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
  }
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}

/** The caller's address as reported by the reverse proxy (nginx sets X-Real-IP). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/**
 * Count one attempt at `action` and throw once the caller is over a limit.
 * `subject` (usually the email) is limited separately from the IP, so one
 * address can't hammer many accounts and many addresses can't hammer one.
 */
export async function rateLimit(
  action: string,
  opts: { perIp: number; perSubject?: number; subject?: string; minutes: number },
): Promise<void> {
  const windowMs = opts.minutes * MINUTE;
  const ip = await clientIp();
  const ipOk = hit(`${action}:ip:${ip}`, opts.perIp, windowMs);
  const subjectOk =
    opts.subject === undefined || opts.perSubject === undefined
      ? true
      : hit(`${action}:subject:${opts.subject}`, opts.perSubject, windowMs);
  if (!ipOk || !subjectOk) {
    throw new ActionError(`Too many attempts. Please wait ${opts.minutes} minutes and try again.`);
  }
}
