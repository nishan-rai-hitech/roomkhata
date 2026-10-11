"use client";

import { recordSettlementAction } from "@/app/actions/expenses";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/shell/page-header";
import { computeBalances, suggestSettlements, type SettlementSuggestion } from "@/lib/balances";
import { SETTLEMENT_METHODS } from "@/lib/constants";
import { formatNpr, toPaisa, toRupees } from "@/lib/money";
import type { Expense, Room, Settlement } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { ArrowRight, Check, HandCoins } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

export function BalancesView({
  room,
  currentUserId,
  expenses,
  settlements,
  today,
}: {
  room: Room;
  currentUserId: string;
  expenses: Expense[];
  /** Newest first. */
  settlements: Settlement[];
  /** Today in the room's timezone, YYYY-MM-DD. */
  today: string;
}) {
  const members = room.members;
  const nameOf = (id: string) => members.find((m) => m.userId === id)?.name ?? "Unknown";
  const colorOf = (id: string) => members.find((m) => m.userId === id)?.avatarColor ?? "#888";
  const firstName = (id: string) => nameOf(id).split(" ")[0];

  const [prefill, setPrefill] = useState<SettlementSuggestion | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  const balances = useMemo(
    () =>
      computeBalances(
        members.map((m) => m.userId),
        expenses,
        settlements,
      ),
    [members, expenses, settlements],
  );
  const suggestions = useMemo(() => suggestSettlements(balances), [balances]);
  const me = balances.find((b) => b.userId === currentUserId)!;
  const canRecord = !room.archived && members.length > 1;

  function openRecord(s?: SettlementSuggestion) {
    setPrefill(s ?? null);
    setError(null);
    setOpen(true);
  }

  function recordSettlement(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = {
      fromUserId: String(fd.get("from")),
      toUserId: String(fd.get("to")),
      amount: toPaisa(String(fd.get("amount") || "0")),
      date: String(fd.get("date") || today),
      method: String(fd.get("method")) as Settlement["method"],
      note: String(fd.get("note") || "") || undefined,
    };
    setError(null);
    startSave(async () => {
      const result = await recordSettlementAction(input);
      if (result.ok) setOpen(false);
      else setError(result.error);
    });
  }

  // People who left stay listed only while they still have a balance.
  const sorted = balances
    .filter((b) => b.net !== 0 || members.find((m) => m.userId === b.userId)?.active)
    .sort((a, b) => b.net - a.net);
  const defaultTo = members.find((m) => m.userId !== currentUserId)?.userId;

  return (
    <div>
      <PageHeader
        title="Balances"
        subtitle={`${room.name} · everyone's net position`}
        actions={
          canRecord && (
            <Button onClick={() => openRecord()}>
              <HandCoins size={16} /> Record a payment
            </Button>
          )
        }
      />

      {/* Your position */}
      <Card className="mb-5">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <p className="text-sm text-muted">Your net balance</p>
            <p
              className={`mt-1 text-3xl font-bold tabular ${
                me.net > 0 ? "text-positive" : me.net < 0 ? "text-negative" : "text-foreground"
              }`}
            >
              {formatNpr(me.net, { sign: true })}
            </p>
            <p className="mt-1 text-sm text-muted">
              {me.net > 0
                ? "Overall you are owed money."
                : me.net < 0
                  ? "Overall you owe money."
                  : "You're all settled up. 🎉"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
            <Mini label="Paid (shared)" value={formatNpr(me.paid)} />
            <Mini label="Your share" value={formatNpr(me.assignedShare)} />
            <Mini label="Settled out" value={formatNpr(me.settlementsPaid)} />
            <Mini label="Settled in" value={formatNpr(me.settlementsReceived)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        {/* Everyone's balances */}
        <Card>
          <CardHeader>
            <CardTitle>Who&apos;s up, who&apos;s down</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {sorted.map((b) => (
              <div key={b.userId} className="flex items-center gap-3 py-3">
                <Avatar name={nameOf(b.userId)} color={colorOf(b.userId)} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {b.userId === currentUserId ? "You" : nameOf(b.userId)}
                  </p>
                  <p className="text-xs text-muted">
                    {b.net > 0 ? "is owed" : b.net < 0 ? "owes" : "settled up"}
                  </p>
                </div>
                {b.net === 0 ? (
                  <Badge tone="neutral">Settled</Badge>
                ) : (
                  <Badge tone={b.net > 0 ? "positive" : "negative"}>
                    {b.net > 0 ? "Creditor" : "Debtor"}
                  </Badge>
                )}
                <span
                  className={`w-28 text-right text-sm font-semibold tabular ${
                    b.net > 0 ? "text-positive" : b.net < 0 ? "text-negative" : "text-muted"
                  }`}
                >
                  {formatNpr(b.net, { sign: true })}
                </span>
              </div>
            ))}
            <p className="pt-3 text-center text-[11px] text-muted">
              All balances always net to exactly {formatNpr(balances.reduce((a, b) => a + b.net, 0))}.
            </p>
          </CardContent>
        </Card>

        {/* Settle up suggestions */}
        <Card>
          <CardHeader>
            <CardTitle>Simplest way to settle up</CardTitle>
          </CardHeader>
          <CardContent>
            {suggestions.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">
                Everyone&apos;s square. No payments needed. 🎉
              </p>
            ) : (
              <ul className="space-y-2">
                {suggestions.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-border p-3"
                  >
                    <Avatar name={nameOf(s.fromUserId)} color={colorOf(s.fromUserId)} size="sm" />
                    <span className="text-sm font-medium">{firstName(s.fromUserId)}</span>
                    <ArrowRight size={16} className="text-muted" />
                    <Avatar name={nameOf(s.toUserId)} color={colorOf(s.toUserId)} size="sm" />
                    <span className="text-sm font-medium">{firstName(s.toUserId)}</span>
                    <span className="ml-auto text-sm font-semibold tabular">
                      {formatNpr(s.amount)}
                    </span>
                    {canRecord && (
                      <Button size="sm" variant="outline" onClick={() => openRecord(s)}>
                        Record
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] text-muted">
              Suggestions minimize the number of transfers. Nothing changes until you record a
              payment.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Settlement history */}
      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Settlement history</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {settlements.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No settlements recorded yet.</p>
          ) : (
            settlements.map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-positive-soft text-positive">
                  <Check size={16} />
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium">
                    {firstName(s.fromUserId)} paid {firstName(s.toUserId)}
                  </p>
                  <p className="text-xs text-muted capitalize">
                    {s.method} · {formatDate(s.date)}
                    {s.note ? ` · ${s.note}` : ""}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular">{formatNpr(s.amount)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Record settlement modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Record a payment"
        description="Log a payment one member made to another. This updates balances."
      >
        <form onSubmit={recordSettlement} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-negative-soft px-3 py-2 text-sm text-negative">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="from">From (payer)</Label>
              <Select id="from" name="from" defaultValue={prefill?.fromUserId ?? currentUserId}>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.userId === currentUserId ? "You" : m.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="to">To (receiver)</Label>
              <Select id="to" name="to" defaultValue={prefill?.toUserId ?? defaultTo}>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.userId === currentUserId ? "You" : m.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="amount">Amount (Rs)</Label>
              <Input
                id="amount"
                name="amount"
                inputMode="decimal"
                defaultValue={prefill ? String(toRupees(prefill.amount)) : ""}
                placeholder="0.00"
                className="tabular"
              />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" defaultValue={today} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="method">Method</Label>
              <Select id="method" name="method" defaultValue="cash">
                {SETTLEMENT_METHODS.map((m) => (
                  <option key={m} value={m} className="capitalize">
                    {m}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="note">Note (optional)</Label>
              <Input id="note" name="note" placeholder="e.g. rent share" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Recording…" : "Record payment"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted">{label}</p>
      <p className="font-semibold tabular">{value}</p>
    </div>
  );
}
