"use client";

import { createExpenseAction, updateExpenseAction } from "@/app/actions/expenses";
import { CategoryIcon } from "@/components/expenses/category-icon";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { FormError } from "@/components/ui/form-error";
import { Input, Label } from "@/components/ui/input";
import { OptionSelect } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/shell/page-header";
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
import { CircleAlert, CircleCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

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
  const [note, setNote] = useState(initial?.note ?? "");
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
  const includedIds = useMemo(
    () =>
      isPersonal
        ? [payerId]
        : members.filter((m) => participants.has(m.userId)).map((m) => m.userId),
    [isPersonal, payerId, members, participants],
  );

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
  const backHref = initial ? `/expenses/${initial.id}` : "/expenses";

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
      note: note.trim() || undefined,
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
      toast.success(initial ? "Expense updated" : "Expense added", {
        description: `${title.trim()} · ${formatNpr(total)}`,
      });
      router.push(backHref);
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <PageHeader
        title={editing ? "Edit expense" : "Add expense"}
        subtitle={roomName}
        actions={
          <Button asChild type="button" variant="ghost">
            <Link href={backHref}>Cancel</Link>
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Left: details */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CardDescription>What was bought, how much, and who paid.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">What was it for?</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Groceries – Bhatbhateni"
                  maxLength={120}
                  autoFocus
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="amount">Amount (Rs)</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                      Rs
                    </span>
                    <Input
                      id="amount"
                      inputMode="decimal"
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9.]/g, ""))}
                      placeholder="0.00"
                      className="pl-10 text-base font-semibold tabular"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <DatePicker id="date" value={date} onChange={setDate} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <OptionSelect
                    id="category"
                    value={category}
                    onValueChange={setCategory}
                    options={CATEGORIES.map((c) => ({
                      value: c,
                      label: (
                        <>
                          <CategoryIcon category={c} className="size-5 rounded-md [&_svg]:size-3" />
                          {c}
                        </>
                      ),
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="payer">Paid by</Label>
                  <OptionSelect
                    id="payer"
                    value={payerId}
                    onValueChange={setPayerId}
                    options={members.map((m) => ({
                      value: m.userId,
                      label: m.userId === currentUserId ? "You" : m.name,
                    }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="note">Note (optional)</Label>
                <Input
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Anything worth remembering"
                  maxLength={500}
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/60 px-4 py-3">
                <label htmlFor="personal" className="cursor-pointer text-sm">
                  <span className="font-medium">Personal expense</span>
                  <span className="block text-xs text-muted-foreground">
                    Only the payer is charged — never affects shared balances.
                  </span>
                </label>
                <Switch id="personal" checked={isPersonal} onCheckedChange={setIsPersonal} />
              </div>
            </CardContent>
          </Card>

          {/* Split method */}
          {!isPersonal && (
            <Card>
              <CardHeader>
                <CardTitle>How to split</CardTitle>
                <CardDescription>
                  {SPLIT_METHODS.find((m) => m.value === method)?.hint}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  role="radiogroup"
                  aria-label="Split method"
                  className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 sm:grid-cols-4"
                >
                  {SPLIT_METHODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      role="radio"
                      aria-checked={method === m.value}
                      onClick={() => setMethod(m.value)}
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm font-medium transition-all",
                        method === m.value
                          ? "bg-card text-primary shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <div className="divide-y divide-border">
                  {members.map((m) => {
                    const included = participants.has(m.userId);
                    const share = shares[m.userId] ?? 0;
                    return (
                      <div key={m.userId} className="flex items-center gap-3 py-2.5">
                        <Checkbox
                          checked={included}
                          onCheckedChange={() => toggleParticipant(m.userId)}
                          aria-label={`Include ${m.name}`}
                        />
                        <Avatar name={m.name} color={m.avatarColor} size="sm" />
                        <span
                          className={cn(
                            "flex-1 truncate text-sm",
                            !included && "text-muted-foreground line-through",
                          )}
                        >
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
                            aria-label={`Shares for ${m.name}`}
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
                              aria-label={`Percent for ${m.name}`}
                            />
                            <span className="text-xs text-muted-foreground">%</span>
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
                            aria-label={`Amount for ${m.name}`}
                          />
                        )}

                        <span
                          className={cn(
                            "w-24 text-right text-sm font-semibold tabular",
                            included ? "text-foreground" : "text-muted-foreground/50",
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
                <Banner tone="bad">{methodError}</Banner>
              ) : balanced ? (
                <Banner tone="ok">Shares add up to the total exactly.</Banner>
              ) : total > 0 ? (
                <Banner tone="bad">
                  {includedIds.length === 0
                    ? "Select at least one person to split with."
                    : remaining > 0
                      ? `${formatNpr(remaining)} still unassigned.`
                      : `${formatNpr(-remaining)} over the total.`}
                </Banner>
              ) : (
                <p className="text-xs text-muted-foreground">Enter an amount to see the split.</p>
              )}

              <FormError message={error} />

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={!canSave}
                loading={saving}
              >
                {editing ? "Save changes" : "Add expense"}
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
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
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular font-semibold", strong && "text-lg", color)}>{value}</span>
    </div>
  );
}

function Banner({ tone, children }: { tone: "ok" | "bad"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
        tone === "ok" ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative",
      )}
    >
      {tone === "ok" ? <CircleCheck size={16} /> : <CircleAlert size={16} />}
      {children}
    </div>
  );
}
