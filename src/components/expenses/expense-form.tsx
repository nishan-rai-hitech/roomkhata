"use client";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/shell/page-header";
import { createExpenseAction, updateExpenseAction } from "@/app/actions/expenses";
import { CATEGORIES, SPLIT_METHODS } from "@/lib/constants";
import {
  formatNpr,
  splitByWeights,
  splitEqually,
  toPaisa,
  toRupees,
  type Paisa,
} from "@/lib/money";
import type { Expense, Member, SplitMethod } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AlertCircle, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

export function ExpenseForm({
  roomName,
  members,
  currentUserId,
  today,
  initial,
}: {
  roomName: string;
  /** Everyone who may be the payer or a participant. */
  members: Member[];
  currentUserId: string;
  /** Today in the room's timezone, YYYY-MM-DD. */
  today: string;
  initial?: Expense;
}) {
  const router = useRouter();
  const editing = !!initial;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [amountStr, setAmountStr] = useState(
    initial ? String(toRupees(initial.amount)) : "",
  );
  const [category, setCategory] = useState(initial?.category ?? "Groceries");
  const [date, setDate] = useState(initial?.date ?? today);
  const [payerId, setPayerId] = useState(
    initial?.payerId ??
      (members.some((m) => m.userId === currentUserId) ? currentUserId : members[0]?.userId ?? ""),
  );
  const [isPersonal, setIsPersonal] = useState(initial?.isPersonal ?? false);
  const [method, setMethod] = useState<SplitMethod>(() => {
    if (!initial) return "equal";
    if (initial.splitMethod !== "percent") return initial.splitMethod;
    // Two-decimal percentages can't always reproduce the saved paisa (e.g. a
    // 1/3 : 2/3 split), so those open as exact amounts instead of drifting.
    const amounts = initial.shares.map((s) => s.amount);
    const back = splitByWeights(initial.amount, splitByWeights(10000, amounts));
    return back.every((v, i) => v === amounts[i]) ? "percent" : "exact";
  });

  const [participants, setParticipants] = useState<Set<string>>(
    new Set(initial ? initial.shares.map((s) => s.userId) : members.map((m) => m.userId)),
  );
  // Only the resulting amounts are stored, so when editing, the per-person
  // inputs are rebuilt from the saved shares.
  const [weights, setWeights] = useState<Record<string, string>>(() => {
    const out = Object.fromEntries(members.map((m) => [m.userId, "1"]));
    const saved = initial?.shares ?? [];
    const divisor = saved.reduce((g, s) => gcd(g, s.amount), 0);
    if (divisor > 0) for (const s of saved) out[s.userId] = String(s.amount / divisor);
    return out;
  });
  const [percents, setPercents] = useState<Record<string, string>>(() => {
    const out = Object.fromEntries(members.map((m) => [m.userId, ""]));
    const saved = initial?.shares ?? [];
    // Hundredths of a percent, so the values always total exactly 100.
    const bps = splitByWeights(10000, saved.map((s) => s.amount));
    saved.forEach((s, i) => (out[s.userId] = String(bps[i] / 100)));
    return out;
  });
  const [exacts, setExacts] = useState<Record<string, string>>(() => {
    const out = Object.fromEntries(members.map((m) => [m.userId, ""]));
    for (const s of initial?.shares ?? []) out[s.userId] = String(toRupees(s.amount));
    return out;
  });
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const total: Paisa = toPaisa(amountStr || "0");

  // Participants actually included (personal = payer only).
  const includedIds = isPersonal
    ? [payerId]
    : members.filter((m) => participants.has(m.userId)).map((m) => m.userId);

  // Compute each participant's share (integer paisa) by method.
  const { shares, assigned, methodError } = useMemo(() => {
    const ids = includedIds;
    if (ids.length === 0 || total <= 0)
      return { shares: {} as Record<string, Paisa>, assigned: 0, methodError: null as string | null };

    if (isPersonal) {
      return { shares: { [payerId]: total }, assigned: total, methodError: null };
    }

    let out: Paisa[] = [];
    let err: string | null = null;

    if (method === "equal") {
      out = splitEqually(total, ids.length);
    } else if (method === "shares") {
      const w = ids.map((id) => Math.max(0, Number(weights[id] || 0)));
      if (w.reduce((a, b) => a + b, 0) <= 0) err = "Enter at least one share weight.";
      out = splitByWeights(total, w);
    } else if (method === "percent") {
      const p = ids.map((id) => Math.max(0, Number(percents[id] || 0)));
      const sum = p.reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 100) > 0.001) err = `Percentages add up to ${sum}% — must be 100%.`;
      // weights scaled by 100 to preserve 2 decimal places
      out = splitByWeights(total, p.map((x) => Math.round(x * 100)));
    } else {
      // exact
      out = ids.map((id) => toPaisa(exacts[id] || "0"));
    }

    const map: Record<string, Paisa> = {};
    ids.forEach((id, i) => (map[id] = out[i] ?? 0));
    const a = Object.values(map).reduce((x, y) => x + y, 0);
    return { shares: map, assigned: a, methodError: err };
  }, [includedIds, total, method, weights, percents, exacts, isPersonal, payerId]);

  const remaining = total - assigned;
  const balanced = total > 0 && remaining === 0 && !methodError;
  const canSave =
    title.trim().length > 0 && total > 0 && includedIds.length > 0 && balanced;

  function toggleParticipant(id: string) {
    setParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave || saving) return;
    const input = {
      title,
      category,
      amount: total,
      date,
      payerId,
      isPersonal,
      splitMethod: method,
      shares: includedIds.map((id) => ({ userId: id, amount: shares[id] ?? 0 })),
      note: initial?.note,
    };
    setError(null);
    startSave(async () => {
      const result = initial
        ? await updateExpenseAction(initial.id, input)
        : await createExpenseAction(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(initial ? `/expenses/${initial.id}` : "/expenses");
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <PageHeader
        title={editing ? "Edit expense" : "Add expense"}
        subtitle={roomName}
        actions={
          <Link href={initial ? `/expenses/${initial.id}` : "/expenses"}>
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Left: details */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">What was it for?</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Groceries – Bhatbhateni"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="amount">Amount (Rs)</Label>
                  <Input
                    id="amount"
                    inputMode="decimal"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="0.00"
                    className="tabular"
                  />
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as typeof category)}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="payer">Paid by</Label>
                  <Select id="payer" value={payerId} onChange={(e) => setPayerId(e.target.value)}>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.userId === currentUserId ? "You" : m.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={isPersonal}
                  onChange={(e) => setIsPersonal(e.target.checked)}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                <span className="text-sm">
                  <span className="font-medium">Personal expense</span>
                  <span className="block text-xs text-muted">
                    Only the payer is charged — never affects shared balances.
                  </span>
                </span>
              </label>
            </CardContent>
          </Card>

          {/* Split method */}
          {!isPersonal && (
            <Card>
              <CardHeader>
                <CardTitle>How to split</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {SPLIT_METHODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMethod(m.value)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                        method === m.value
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-border text-muted hover:bg-surface-2",
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted">
                  {SPLIT_METHODS.find((m) => m.value === method)?.hint}
                </p>

                <div className="divide-y divide-border">
                  {members.map((m) => {
                    const included = participants.has(m.userId);
                    const share = shares[m.userId] ?? 0;
                    return (
                      <div key={m.userId} className="flex items-center gap-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={included}
                          onChange={() => toggleParticipant(m.userId)}
                          className="h-4 w-4 accent-[var(--primary)]"
                          aria-label={`Include ${m.name}`}
                        />
                        <Avatar name={m.name} color={m.avatarColor} size="sm" />
                        <span className="flex-1 truncate text-sm">
                          {m.userId === currentUserId ? "You" : m.name}
                        </span>

                        {included && method === "shares" && (
                          <Input
                            value={weights[m.userId] ?? ""}
                            onChange={(e) =>
                              setWeights((w) => ({ ...w, [m.userId]: e.target.value.replace(/[^0-9]/g, "") }))
                            }
                            className="h-8 w-16 text-center tabular"
                            inputMode="numeric"
                          />
                        )}
                        {included && method === "percent" && (
                          <div className="flex items-center gap-1">
                            <Input
                              value={percents[m.userId] ?? ""}
                              onChange={(e) =>
                                setPercents((p) => ({ ...p, [m.userId]: e.target.value.replace(/[^0-9.]/g, "") }))
                              }
                              className="h-8 w-16 text-center tabular"
                              inputMode="decimal"
                              placeholder="0"
                            />
                            <span className="text-xs text-muted">%</span>
                          </div>
                        )}
                        {included && method === "exact" && (
                          <Input
                            value={exacts[m.userId] ?? ""}
                            onChange={(e) =>
                              setExacts((x) => ({ ...x, [m.userId]: e.target.value.replace(/[^0-9.]/g, "") }))
                            }
                            className="h-8 w-24 text-center tabular"
                            inputMode="decimal"
                            placeholder="0.00"
                          />
                        )}

                        <span
                          className={cn(
                            "w-24 text-right text-sm font-semibold tabular",
                            included ? "text-foreground" : "text-muted/50",
                          )}
                        >
                          {included ? formatNpr(share) : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: summary */}
        <div>
          <Card className="lg:sticky lg:top-20">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Row label="Total" value={formatNpr(total)} strong />
              <Row label="Assigned" value={formatNpr(assigned)} />
              <div className="h-px bg-border" />
              <Row
                label="Remaining"
                value={formatNpr(remaining)}
                tone={remaining === 0 ? "ok" : "bad"}
              />

              {methodError ? (
                <Banner tone="bad" icon={<AlertCircle size={16} />}>{methodError}</Banner>
              ) : balanced ? (
                <Banner tone="ok" icon={<Check size={16} />}>
                  Shares add up to the total exactly.
                </Banner>
              ) : total > 0 ? (
                <Banner tone="bad" icon={<AlertCircle size={16} />}>
                  {remaining > 0
                    ? `${formatNpr(remaining)} still unassigned.`
                    : `${formatNpr(-remaining)} over the total.`}
                </Banner>
              ) : (
                <p className="text-xs text-muted">Enter an amount to see the split.</p>
              )}

              {error && (
                <Banner tone="bad" icon={<AlertCircle size={16} />}>{error}</Banner>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={!canSave || saving}>
                {saving ? "Saving…" : editing ? "Save changes" : "Add expense"}
              </Button>
              <p className="text-center text-[11px] text-muted">
                Amounts are stored as exact paisa — no rounding drift.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "ok" | "bad";
}) {
  const color = tone === "ok" ? "text-positive" : tone === "bad" ? "text-negative" : "";
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className={cn("tabular font-semibold", strong && "text-base", color)}>{value}</span>
    </div>
  );
}

function Banner({
  tone,
  icon,
  children,
}: {
  tone: "ok" | "bad";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
        tone === "ok" ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative",
      )}
    >
      {icon}
      {children}
    </div>
  );
}
