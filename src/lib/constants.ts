import type { Category, SplitMethod } from "./types";

export const CATEGORIES: Category[] = [
  "Groceries",
  "Rent",
  "Utilities",
  "Internet",
  "Dining",
  "Transport",
  "Household",
  "Other",
];

export const SPLIT_METHODS: { value: SplitMethod; label: string; hint: string }[] = [
  { value: "equal", label: "Equally", hint: "Split evenly among everyone selected" },
  { value: "shares", label: "By shares", hint: "Weight by shares, e.g. 2:1:1" },
  { value: "exact", label: "Exact amounts", hint: "Type each person's exact amount" },
  { value: "percent", label: "By percent", hint: "Split by percentage, totals 100%" },
];

export const TIMEZONES = ["Asia/Kathmandu", "Asia/Kolkata", "Asia/Dubai", "UTC"];

export const SETTLEMENT_METHODS = ["cash", "bank", "wallet"] as const;

export const AVATAR_COLORS = [
  "#059669",
  "#2563eb",
  "#db2777",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#65a30d",
  "#dc2626",
];

export const CATEGORY_COLORS: Record<Category, string> = {
  Groceries: "#059669",
  Rent: "#2563eb",
  Utilities: "#d97706",
  Internet: "#7c3aed",
  Dining: "#db2777",
  Transport: "#0891b2",
  Household: "#65a30d",
  Other: "#64748b",
};
