import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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

/** Format a fixed ISO date string (deterministic — no current-time use). */
export function formatDate(
  iso: string,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
): string {
  return new Date(iso).toLocaleDateString("en-GB", opts);
}

/** "2026-10" → "October 2026" */
export function monthLabel(monthKey: string): string {
  return new Date(`${monthKey}-01`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}
