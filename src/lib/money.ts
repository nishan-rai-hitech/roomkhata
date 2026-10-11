/**
 * Money utilities — RoomKhata.
 *
 * All monetary values are stored and computed as INTEGER PAISA (1 rupee = 100 paisa)
 * to guarantee exact precision. Never use floating-point for stored amounts.
 * Formatting to rupees happens only at the display boundary.
 *
 * This mirrors the backend contract so the UI and server agree on precision.
 */

export type Paisa = number; // always an integer

export const PAISA_PER_RUPEE = 100;

/** Parse a user-entered rupee string/number into integer paisa. */
export function toPaisa(rupees: string | number): Paisa {
  const n = typeof rupees === "string" ? Number(rupees.replace(/,/g, "")) : rupees;
  if (!Number.isFinite(n)) return 0;
  // Round to nearest paisa to avoid fp artifacts (e.g. 19.99 * 100 = 1998.9999)
  return Math.round(n * PAISA_PER_RUPEE);
}

/** Convert integer paisa back to a rupee number (display only). */
export function toRupees(paisa: Paisa): number {
  return paisa / PAISA_PER_RUPEE;
}

/**
 * Deterministic even split of `total` paisa across `n` participants.
 * Remainder paisa are distributed one-by-one to the first participants,
 * so the shares always sum back to exactly `total`.
 */
export function splitEqually(total: Paisa, n: number): Paisa[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  let remainder = total - base * n; // 0..n-1 extra paisa
  return Array.from({ length: n }, () => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    return base + extra;
  });
}

/**
 * Split `total` by integer weights (e.g. shares [2,1,1]).
 * Largest-remainder method so shares sum back to exactly `total`.
 */
export function splitByWeights(total: Paisa, weights: number[]): Paisa[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const floored = raw.map(Math.floor);
  let remainder = total - floored.reduce((a, b) => a + b, 0);
  // Give leftover paisa to the entries with the largest fractional part.
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  const result = [...floored];
  for (const { i } of order) {
    if (remainder <= 0) break;
    result[i] += 1;
    remainder -= 1;
  }
  return result;
}

/** Validate that assigned shares exactly equal the expense total. */
export function sharesMatchTotal(total: Paisa, shares: Paisa[]): boolean {
  return shares.reduce((a, b) => a + b, 0) === total;
}

/** Format integer paisa as a localized NPR string, e.g. "Rs 1,250.00". */
export function formatNpr(paisa: Paisa, opts?: { sign?: boolean }): string {
  const sign = opts?.sign && paisa > 0 ? "+" : "";
  const value = toRupees(Math.abs(paisa)).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const neg = paisa < 0 ? "−" : "";
  return `${neg}${sign}Rs ${value}`;
}
