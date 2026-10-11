import NepaliDate, { dateConfigMap } from "nepali-date-converter";

/**
 * Bikram Sambat (BS) calendar helpers. Dates are still STORED as AD
 * `YYYY-MM-DD` strings; BS is only how they are shown, picked and grouped.
 */

export const BS_MONTHS = [
  "Baisakh",
  "Jestha",
  "Ashadh",
  "Shrawan",
  "Bhadra",
  "Ashwin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
] as const;

// The range the conversion table covers (AD 1943-04-14 to 2034-04-13).
export const BS_MIN_YEAR = 2000;
export const BS_MAX_YEAR = 2090;

export interface BsDate {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
}

/** AD `YYYY-MM-DD` → BS, or null when outside the supported range. */
export function adToBs(iso: string): BsDate | null {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  try {
    const bs = new NepaliDate(new Date(y, m - 1, d));
    return { year: bs.getYear(), month: bs.getMonth() + 1, day: bs.getDate() };
  } catch {
    return null;
  }
}

/** BS → AD `YYYY-MM-DD`, or null when outside the supported range. */
export function bsToAd(bs: BsDate): string | null {
  if (bs.year < BS_MIN_YEAR || bs.year > BS_MAX_YEAR) return null;
  try {
    const ad = new NepaliDate(bs.year, bs.month - 1, bs.day).toJsDate();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${ad.getFullYear()}-${pad(ad.getMonth() + 1)}-${pad(ad.getDate())}`;
  } catch {
    return null;
  }
}

export function daysInBsMonth(year: number, month: number): number {
  const config = dateConfigMap[String(year)];
  return config ? Object.values(config)[month - 1] : 30;
}

/** The BS month an AD date falls in, as a sortable key: "2026-10-11" → "2083-06". */
export function bsMonthKey(iso: string): string {
  const bs = adToBs(iso);
  // Out of range: fall back to the AD month so the expense is still grouped somewhere.
  if (!bs) return iso.slice(0, 7);
  return `${bs.year}-${String(bs.month).padStart(2, "0")}`;
}
