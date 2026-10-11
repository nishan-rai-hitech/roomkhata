"use client";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat";
import { PageHeader } from "@/components/shell/page-header";
import { CATEGORIES, CATEGORY_COLORS } from "@/lib/constants";
import { formatNpr } from "@/lib/money";
import type { Expense, Room } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export function ExpenseList({
  room,
  currentUserId,
  expenses,
}: {
  room: Room;
  currentUserId: string;
  /** Newest first. */
  expenses: Expense[];
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [payer, setPayer] = useState("all");
  const [type, setType] = useState("all");

  const nameOf = (id: string) => room.members.find((m) => m.userId === id)?.name ?? "Unknown";
  const colorOf = (id: string) =>
    room.members.find((m) => m.userId === id)?.avatarColor ?? "#888";

  const filtered = useMemo(() => {
    return expenses
      .filter((e) => (q ? e.title.toLowerCase().includes(q.toLowerCase()) : true))
      .filter((e) => (cat === "all" ? true : e.category === cat))
      .filter((e) => (payer === "all" ? true : e.payerId === payer))
      .filter((e) =>
        type === "all" ? true : type === "personal" ? e.isPersonal : !e.isPersonal,
      );
  }, [expenses, q, cat, payer, type]);

  const sharedTotal = filtered.filter((e) => !e.isPersonal).reduce((a, e) => a + e.amount, 0);
  const myShare = filtered
    .filter((e) => !e.isPersonal)
    .reduce((a, e) => a + (e.shares.find((s) => s.userId === currentUserId)?.amount ?? 0), 0);

  // Group by date
  const groups = useMemo(() => {
    const m = new Map<string, typeof filtered>();
    for (const e of filtered) {
      const arr = m.get(e.date) ?? [];
      arr.push(e);
      m.set(e.date, arr);
    }
    return [...m.entries()];
  }, [filtered]);

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle={room.archived ? `${room.name} · archived (read-only)` : room.name}
        actions={
          !room.archived && (
            <Link href="/expenses/new">
              <Button>
                <Plus size={16} /> Add expense
              </Button>
            </Link>
          )
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Shared (filtered)" value={formatNpr(sharedTotal)} hint={`${filtered.filter((e) => !e.isPersonal).length} expenses`} />
        <StatCard label="Your share (filtered)" value={formatNpr(myShare)} />
        <StatCard label="Showing" value={filtered.length} hint={`of ${expenses.length} expenses`} />
      </div>

      {/* Filters */}
      <Card className="mb-5">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[12rem] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search expenses…"
              className="pl-9"
            />
          </div>
          <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-auto">
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select value={payer} onChange={(e) => setPayer(e.target.value)} className="w-auto">
            <option value="all">Anyone paid</option>
            {room.members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </Select>
          <Select value={type} onChange={(e) => setType(e.target.value)} className="w-auto">
            <option value="all">All types</option>
            <option value="shared">Shared</option>
            <option value="personal">Personal</option>
          </Select>
        </CardContent>
      </Card>

      {/* List */}
      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted">
            {expenses.length === 0
              ? "No expenses in this room yet."
              : "No expenses match your filters."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {groups.map(([date, items]) => (
            <div key={date}>
              <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted">
                {formatDate(date, { weekday: "short", day: "numeric", month: "long" })}
              </p>
              <Card>
                <CardContent className="divide-y divide-border p-0">
                  {items.map((e) => {
                    const myS = e.shares.find((s) => s.userId === currentUserId)?.amount ?? 0;
                    return (
                      <Link
                        key={e.id}
                        href={`/expenses/${e.id}`}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                      >
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white"
                          style={{ backgroundColor: CATEGORY_COLORS[e.category as keyof typeof CATEGORY_COLORS] ?? "#64748b" }}
                        >
                          {e.category.slice(0, 2)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 truncate text-sm font-medium">
                            {e.title}
                            {e.isPersonal && <Badge tone="neutral">Personal</Badge>}
                          </p>
                          <p className="flex items-center gap-1.5 text-xs text-muted">
                            <Avatar name={nameOf(e.payerId)} color={colorOf(e.payerId)} size="sm" className="h-4 w-4 text-[9px]" />
                            Paid by {e.payerId === currentUserId ? "you" : nameOf(e.payerId).split(" ")[0]} · {e.category}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular">{formatNpr(e.amount)}</p>
                          {!e.isPersonal && (
                            <p className="text-xs text-muted tabular">your share {formatNpr(myS)}</p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
