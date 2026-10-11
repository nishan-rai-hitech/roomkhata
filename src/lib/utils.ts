import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { BS_MONTHS, BS_WEEKDAYS, adToBs, nepaliDigits } from "./bs";

/** className combiner — later Tailwind classes override earlier conflicting ones. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Initials from a full name, max 2 letters. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Format a fixed ISO date string in the Bikram Sambat calendar, e.g.
 * "२५ असोज २०८३" (deterministic — no current-time use). Only `weekday` and
 * `year` in `opts` change the output; the day and month are always shown.
 */
export function formatDate(
  iso: string,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
): string {
  // Full timestamps are read as the calendar day in Nepal, on server and client alike.
  const day = /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? iso
    : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu" }).format(new Date(iso));
  const bs = adToBs(day);
  if (!bs) return new Date(iso).toLocaleDateString("en-GB", opts);
  const weekday = opts.weekday ? `${BS_WEEKDAYS[new Date(`${day}T00:00:00Z`).getUTCDay()]}, ` : "";
  const year = opts.year ? ` ${nepaliDigits(bs.year)}` : "";
  return `${weekday}${nepaliDigits(bs.day)} ${BS_MONTHS[bs.month - 1]}${year}`;
}

/** BS month key (see `bsMonthKey`) → label: "2083-06" → "असोज २०८३" */
export function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return `${BS_MONTHS[month - 1] ?? ""} ${nepaliDigits(year)}`.trim();
}
