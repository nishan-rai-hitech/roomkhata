import type { Paisa } from "./money";

export type Id = string;

export type RoomRole = "owner" | "admin" | "member";

export interface User {
  id: Id;
  name: string;
  email: string;
  avatarColor: string; // for initials avatar
}

export interface Member {
  userId: Id;
  name: string;
  email: string;
  avatarColor: string;
  role: RoomRole;
  joinedAt: string; // ISO
  active: boolean;
}

export interface Room {
  id: Id;
  name: string;
  description?: string;
  currency: "NPR";
  timezone: string; // e.g. "Asia/Kathmandu"
  inviteCode: string; // shareable join code
  createdAt: string;
  /** Archived rooms keep their history but are read-only. */
  archived: boolean;
  /** Includes inactive (removed/left) members so history keeps their names. */
  members: Member[];
}

export interface PendingInvite {
  id: Id;
  roomId: Id;
  roomName: string;
  invitedByName: string;
  expiresAt: string;
}

export type SplitMethod = "equal" | "shares" | "exact" | "percent";

export interface ExpenseShare {
  userId: Id;
  amount: Paisa; // assigned share, integer paisa; sum === expense.amount
}

export interface Expense {
  id: Id;
  roomId: Id;
  title: string;
  category: string;
  amount: Paisa; // total, integer paisa
  /** Who actually paid the money. */
  payerId: Id;
  /** Who entered the record (audit). May differ from payer. */
  createdById: Id;
  /** Effective expense date (used for monthly reports), ISO date. */
  date: string;
  splitMethod: SplitMethod;
  /** Participants and their assigned shares. Sum must equal `amount`. */
  shares: ExpenseShare[];
  /** Personal expenses never affect shared balances. */
  isPersonal: boolean;
  note?: string;
  createdAt: string;
}

export interface Settlement {
  id: Id;
  roomId: Id;
  fromUserId: Id; // payer of the settlement
  toUserId: Id; // receiver
  amount: Paisa;
  date: string; // settlement date, separate from expense date
  method: "cash" | "bank" | "wallet";
  note?: string;
  createdAt: string;
}

export type Category =
  | "Groceries"
  | "Rent"
  | "Utilities"
  | "Internet"
  | "Dining"
  | "Transport"
  | "Household"
  | "Other";
