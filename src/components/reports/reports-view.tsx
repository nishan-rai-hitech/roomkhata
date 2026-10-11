"use client";

import { CategoryIcon } from "@/components/expenses/category-icon";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { OptionSelect } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat";
import { PageHeader } from "@/components/shell/page-header";
import { bsMonthKey } from "@/lib/bs";
import { CATEGORY_COLORS } from "@/lib/constants";
import { formatNpr, toRupees } from "@/lib/money";
import type { Category, Expense, Room } from "@/lib/types";
import { cn, formatDate, monthLabel } from "@/lib/utils";
import {
  ChartPie,
  CircleAlert,
  CircleCheck,
  Download,
  FileText,
  Receipt,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";

export function ReportsView({
  room,
  currentUserId,
  expenses,
  currentMonth,
}: {
  room: Room;
  currentUserId: string;
  expenses: Expense[];
  /** This BS month in the room's timezone, as a `bsMonthKey`. */
  currentMonth: string;
}) {
  const members = room.members;
  const nameOf = (id: string) => members.find((m) => m.userId === id)?.name ?? "Unknown";

  // The current month plus every month present in the data (effective date, descending).
  const months = useMemo(
    () => [...new Set([currentMonth, ...expenses.map((e) => bsMonthKey(e.date))])].sort().reverse(),
    [currentMonth, expenses],
  );
  const [month, setMonth] = useState(currentMonth);

  // Shared expenses whose EFFECTIVE date falls in the selected month.
  const monthExpenses = useMemo(
    () => expenses.filter((e) => !e.isPersonal && bsMonthKey(e.date) === month),
    [expenses, month],
  );

  const total = monthExpenses.reduce((a, e) => a + e.amount, 0);
  const myShare = monthExpenses.reduce(
    (a, e) => a + (e.shares.find((s) => s.userId === currentUserId)?.amount ?? 0),
    0,
  );

  // Category breakdown
  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of monthExpenses) m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [monthExpenses]);

  // Per-member: paid vs share
  const byMember = useMemo(() => {
    return members
      .map((mem) => {
        const paid = monthExpenses
          .filter((e) => e.payerId === mem.userId)
          .reduce((a, e) => a + e.amount, 0);
        const share = monthExpenses.reduce(
          (a, e) => a + (e.shares.find((s) => s.userId === mem.userId)?.amount ?? 0),
          0,
        );
        return { ...mem, paid, share };
      })
      // People who left only appear in months they were part of.
      .filter((m) => m.active || m.paid > 0 || m.share > 0);
  }, [monthExpenses, members]);

  // Reconciliation: category totals and member-share totals must equal the ledger total.
  const catSum = byCategory.reduce((a, [, v]) => a + v, 0);
  const shareSum = byMember.reduce((a, m) => a + m.share, 0);
  const reconciles = catSum === total && shareSum === total;

  function exportCsv() {
    const rows = [
      ["Title", "Category", "Paid by", "Date (BS)", "Date (AD)", "Amount (Rs)"],
      ...monthExpenses.map((e) => [
        e.title,
        e.category,
        nameOf(e.payerId),
        formatDate(e.date),
        e.date,
        toRupees(e.amount).toFixed(2),
      ]),
      [],
      ["Total", "", "", "", "", toRupees(total).toFixed(2)],
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roomkhata-${room.name.replace(/\s+/g, "-")}-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle={`${room.name} · times shown in ${room.timezone}`}
        actions={
          <>
            <OptionSelect
              value={month}
              onValueChange={setMonth}
              className="w-auto min-w-40"
              options={months.map((m) => ({ value: m, label: monthLabel(m) }))}
            />
            <Button variant="outline" onClick={exportCsv}>
              <Download /> CSV
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <FileText /> PDF
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total shared spending"
          value={formatNpr(total)}
          hint={monthLabel(month)}
          icon={<Receipt size={16} />}
        />
        <StatCard label="Your share" value={formatNpr(myShare)} icon={<Wallet size={16} />} />
        <StatCard
          label="Shared expenses"
          value={monthExpenses.length}
          hint="this month"
          icon={<ChartPie size={16} />}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Category breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Spending by category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {byCategory.length === 0 ? (
              <EmptyState
                className="py-8"
                icon={<ChartPie />}
                title="No spending this month"
                description="Shared expenses dated in this month will be broken down here."
              />
            ) : (
              byCategory.map(([cat, amt]) => {
                const pct = total > 0 ? (amt / total) * 100 : 0;
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <CategoryIcon category={cat} className="size-9 rounded-lg [&_svg]:size-4" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                        <span className="truncate font-medium">{cat}</span>
                        <span className="tabular text-muted-foreground">
                          {formatNpr(amt)} · {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: CATEGORY_COLORS[cat as Category] ?? "#64748b",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Per-member */}
        <Card>
          <CardHeader>
            <CardTitle>Per member</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {byMember.map((m) => (
              <div key={m.userId} className="flex items-center gap-3 py-3">
                <Avatar name={m.name} color={m.avatarColor} size="sm" />
                <span className="flex-1 truncate text-sm font-medium">
                  {m.userId === currentUserId ? "You" : m.name}
                </span>
                <div className="text-right">
                  <p className="text-sm tabular">
                    <span className="text-muted-foreground">paid </span>
                    <span className="font-semibold">{formatNpr(m.paid)}</span>
                  </p>
                  <p className="text-xs tabular text-muted-foreground">
                    share {formatNpr(m.share)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Reconciliation */}
      <div
        className={cn(
          "mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl px-4 py-3 text-sm",
          reconciles ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative",
        )}
      >
        {reconciles ? <CircleCheck size={16} /> : <CircleAlert size={16} />}
        <span className="font-medium">
          {reconciles ? "Report reconciles" : "Reconciliation mismatch"}
        </span>
        <span className="text-xs opacity-80">
          Category total ({formatNpr(catSum)}) and member shares ({formatNpr(shareSum)}) both equal
          the ledger total ({formatNpr(total)}).
        </span>
      </div>
    </div>
  );
}
