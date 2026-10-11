"use client";

import { CategoryIcon } from "@/components/expenses/category-icon";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat";
import { PageHeader } from "@/components/shell/page-header";
import { CATEGORIES } from "@/lib/constants";
import { formatNpr } from "@/lib/money";
import type { Expense, Room } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { ChevronRight, ListFilter, Plus, Receipt, Search, SearchX, Wallet, X } from "lucide-react";
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
  const filtering = q !== "" || cat !== "all" || payer !== "all" || type !== "all";

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

  const shared = filtered.filter((e) => !e.isPersonal);
  const sharedTotal = shared.reduce((a, e) => a + e.amount, 0);
  const myShare = shared.reduce(
    (a, e) => a + (e.shares.find((s) => s.userId === currentUserId)?.amount ?? 0),
    0,
  );

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

  function clearFilters() {
    setQ("");
    setCat("all");
    setPayer("all");
    setType("all");
  }

  const addButton = !room.archived && (
    <Button asChild>
      <Link href="/expenses/new">
        <Plus /> Add expense
      </Link>
    </Button>
  );

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle={room.archived ? `${room.name} · archived (read-only)` : room.name}
        actions={addButton}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          label={filtering ? "Shared (filtered)" : "Shared spending"}
          value={formatNpr(sharedTotal)}
          hint={`${shared.length} shared expenses`}
          icon={<Receipt size={16} />}
        />
        <StatCard
          label={filtering ? "Your share (filtered)" : "Your share"}
          value={formatNpr(myShare)}
          icon={<Wallet size={16} />}
        />
        <StatCard
          label="Showing"
          value={filtered.length}
          hint={`of ${expenses.length} expenses`}
          icon={<ListFilter size={16} />}
        />
      </div>

      {/* Filters */}
      <Card className="mb-5">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[12rem] flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search expenses…"
              aria-label="Search expenses"
              className="pl-9"
            />
          </div>
          <OptionSelect
            value={cat}
            onValueChange={setCat}
            className="w-auto min-w-36"
            options={[
              { value: "all", label: "All categories" },
              ...CATEGORIES.map((c) => ({ value: c, label: c })),
            ]}
          />
          <OptionSelect
            value={payer}
            onValueChange={setPayer}
            className="w-auto min-w-36"
            options={[
              { value: "all", label: "Anyone paid" },
              ...room.members.map((m) => ({ value: m.userId, label: m.name })),
            ]}
          />
          <OptionSelect
            value={type}
            onValueChange={setType}
            className="w-auto min-w-28"
            options={[
              { value: "all", label: "All types" },
              { value: "shared", label: "Shared" },
              { value: "personal", label: "Personal" },
            ]}
          />
          {filtering && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X /> Clear
            </Button>
          )}
        </CardContent>
      </Card>

      {/* List */}
      {groups.length === 0 ? (
        <Card>
          {expenses.length === 0 ? (
            <EmptyState
              className="py-16"
              icon={<Receipt />}
              title="No expenses yet"
              description="Add the first expense for this room — rent, groceries, anything you share."
              action={addButton}
            />
          ) : (
            <EmptyState
              className="py-16"
              icon={<SearchX />}
              title="No expenses match your filters"
              description="Try a different search or clear the filters."
              action={
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          )}
        </Card>
      ) : (
        <div className="space-y-5">
          {groups.map(([date, items]) => (
            <div key={date}>
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {formatDate(date, { weekday: "short", day: "numeric", month: "long" })}
              </p>
              <Card className="overflow-hidden">
                <CardContent className="divide-y divide-border p-0">
                  {items.map((e) => {
                    const myS = e.shares.find((s) => s.userId === currentUserId)?.amount ?? 0;
                    return (
                      <Link
                        key={e.id}
                        href={`/expenses/${e.id}`}
                        className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
                      >
                        <CategoryIcon category={e.category} />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 text-sm font-medium">
                            <span className="truncate">{e.title}</span>
                            {e.isPersonal && <Badge tone="neutral">Personal</Badge>}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Avatar
                              name={nameOf(e.payerId)}
                              color={colorOf(e.payerId)}
                              size="sm"
                              className="size-4 text-[8px]"
                            />
                            Paid by{" "}
                            {e.payerId === currentUserId ? "you" : nameOf(e.payerId).split(" ")[0]} ·{" "}
                            {e.category}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular">{formatNpr(e.amount)}</p>
                          {!e.isPersonal && (
                            <p className="text-xs text-muted-foreground tabular">
                              your share {formatNpr(myS)}
                            </p>
                          )}
                        </div>
                        <ChevronRight
                          size={16}
                          className="text-muted-foreground/50 transition-transform group-hover:translate-x-0.5"
                        />
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
