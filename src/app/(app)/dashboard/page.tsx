import { CategoryIcon } from "@/components/expenses/category-icon";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { NoRoom } from "@/components/shell/no-room";
import { PageHeader } from "@/components/shell/page-header";
import { computeBalances, suggestSettlements } from "@/lib/balances";
import { bsMonthKey } from "@/lib/bs";
import { CATEGORY_COLORS } from "@/lib/constants";
import { formatNpr } from "@/lib/money";
import { getAppContext, getLedger, todayIn } from "@/lib/server/data";
import type { Category } from "@/lib/types";
import { cn, formatDate, monthLabel } from "@/lib/utils";
import { ArrowRight, HandCoins, PartyPopper, Plus, Receipt, UserPlus, Wallet } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const { user, room } = await getAppContext();
  if (!room) return <NoRoom title={`Hi, ${user.name.split(" ")[0]} 👋`} />;
  const { expenses, settlements } = await getLedger(room);

  const memberIds = room.members.map((m) => m.userId);
  const nameOf = (id: string) => room.members.find((m) => m.userId === id)?.name ?? "Unknown";
  const colorOf = (id: string) =>
    room.members.find((m) => m.userId === id)?.avatarColor ?? "#888";
  const firstName = (id: string) => (id === user.id ? "You" : nameOf(id).split(" ")[0]);

  const balances = computeBalances(memberIds, expenses, settlements);
  const me = balances.find((b) => b.userId === user.id)!;
  const suggestions = suggestSettlements(balances);
  const mySuggestions = suggestions.filter(
    (s) => s.fromUserId === user.id || s.toUserId === user.id,
  );

  // The current BS month in the room's own timezone.
  const monthKey = bsMonthKey(todayIn(room.timezone));
  const monthExpenses = expenses.filter((e) => !e.isPersonal && bsMonthKey(e.date) === monthKey);
  const sharedThisMonth = monthExpenses.reduce((a, e) => a + e.amount, 0);
  const myShareThisMonth = monthExpenses.reduce(
    (a, e) => a + (e.shares.find((s) => s.userId === user.id)?.amount ?? 0),
    0,
  );

  // Where this month's shared money went, biggest first.
  const categoryTotals = new Map<string, number>();
  for (const e of monthExpenses) {
    categoryTotals.set(e.category, (categoryTotals.get(e.category) ?? 0) + e.amount);
  }
  const topCategories = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Unified recent activity feed.
  const activity = [
    ...expenses.map((e) => ({
      kind: "expense" as const,
      id: e.id,
      href: `/expenses/${e.id}`,
      date: e.date,
      createdAt: e.createdAt,
      title: e.title,
      category: e.category,
      payer: e.payerId,
      amount: e.amount,
      personal: e.isPersonal,
    })),
    ...settlements.map((s) => ({
      kind: "settlement" as const,
      id: s.id,
      href: "/balances",
      date: s.date,
      createdAt: s.createdAt,
      title: `${nameOf(s.fromUserId)} paid ${nameOf(s.toUserId)}`,
      category: "settlement",
      payer: s.fromUserId,
      amount: s.amount,
      personal: false,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);

  const quickActions = [
    { href: "/expenses/new", label: "Add expense", icon: <Plus size={18} />, primary: true },
    { href: "/balances", label: "Settle up", icon: <HandCoins size={18} />, primary: false },
    { href: `/rooms/${room.id}`, label: "Invite", icon: <UserPlus size={18} />, primary: false },
  ];

  return (
    <div>
      <PageHeader
        title={`Hi, ${user.name.split(" ")[0]} 👋`}
        subtitle={`${room.name} · ${monthLabel(monthKey)}`}
      />

      {/* Where you stand, in plain words */}
      <section className="relative mb-4 overflow-hidden rounded-2xl bg-sidebar p-5 text-white shadow-lg sm:p-8">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(32rem 20rem at 100% 0%, color-mix(in oklab, var(--sidebar-primary) 34%, transparent), transparent 70%), radial-gradient(24rem 16rem at 0% 100%, color-mix(in oklab, var(--sidebar-primary) 14%, transparent), transparent 70%)",
          }}
        />
        <div className="relative grid gap-5 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-sidebar-muted">
              <Wallet size={16} />
              {me.net > 0 ? "You get back" : me.net < 0 ? "You need to pay" : "Your balance"}
            </p>
            <p
              className={cn(
                "mt-2 text-4xl font-bold tracking-tight tabular sm:text-5xl",
                me.net > 0 && "text-sidebar-primary",
                me.net < 0 && "text-red-300",
              )}
            >
              {me.net === 0 ? "All settled 🎉" : formatNpr(Math.abs(me.net))}
            </p>
            <p className="mt-2 text-sm text-sidebar-foreground">
              {me.net > 0
                ? "Your flatmates owe you this much in total."
                : me.net < 0
                  ? "This is what you owe your flatmates in total."
                  : "You don't owe anyone, and no one owes you."}
            </p>
          </div>

          {/* Exactly who pays whom */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            {mySuggestions.length === 0 ? (
              <p className="flex items-center gap-3 text-sm text-sidebar-foreground">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <PartyPopper size={18} className="text-sidebar-primary" />
                </span>
                Nothing to pay or collect right now.
              </p>
            ) : (
              <>
                <p className="mb-2.5 text-xs font-medium text-sidebar-muted">To settle up</p>
                <ul className="space-y-2.5">
                  {mySuggestions.slice(0, 3).map((s, i) => {
                    const iPay = s.fromUserId === user.id;
                    const other = iPay ? s.toUserId : s.fromUserId;
                    return (
                      <li key={i} className="flex items-center gap-3">
                        <Avatar name={nameOf(other)} color={colorOf(other)} size="sm" />
                        <p className="min-w-0 flex-1 truncate text-sm">
                          {iPay ? (
                            <>
                              You pay <span className="font-semibold">{firstName(other)}</span>
                            </>
                          ) : (
                            <>
                              <span className="font-semibold">{firstName(other)}</span> pays you
                            </>
                          )}
                        </p>
                        <span
                          className={cn(
                            "shrink-0 text-sm font-bold tabular",
                            iPay ? "text-red-300" : "text-sidebar-primary",
                          )}
                        >
                          {formatNpr(s.amount)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {mySuggestions.length > 3 && (
                  <p className="mt-2.5 text-xs text-sidebar-muted">
                    and {mySuggestions.length - 3} more on the Balances page
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Quick actions */}
      {!room.archived && (
        <div className="mb-5 grid grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 text-center text-sm font-semibold shadow-xs transition-colors sm:flex-row sm:py-4",
                action.primary
                  ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border-border bg-card hover:bg-muted",
              )}
            >
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-full",
                  action.primary ? "bg-white/15" : "bg-primary-soft text-primary",
                )}
              >
                {action.icon}
              </span>
              {action.label}
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        {/* Recent activity */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Recent activity</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link href="/expenses">
                View all <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-2 pb-2">
            {activity.length === 0 ? (
              <EmptyState
                icon={<Receipt />}
                title="Nothing here yet"
                description="Add your first expense and it will show up here."
              />
            ) : (
              activity.map((a) => (
                <Link
                  key={`${a.kind}-${a.id}`}
                  href={a.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted"
                >
                  <CategoryIcon category={a.category} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.kind === "settlement" ? "Payment" : `${firstName(a.payer)} paid`} ·{" "}
                      {formatDate(a.date)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular">{formatNpr(a.amount)}</p>
                    {a.personal && <Badge tone="neutral">Personal</Badge>}
                    {a.kind === "settlement" && <Badge tone="positive">Settled</Badge>}
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          {/* This month */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>This month</CardTitle>
              <span className="text-xs text-muted-foreground">{monthLabel(monthKey)}</span>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0 rounded-xl bg-muted/60 p-3">
                  <p className="text-xs text-muted-foreground">Room spent</p>
                  <p className="mt-1 text-base font-bold tabular sm:text-lg">
                    {formatNpr(sharedThisMonth)}
                  </p>
                </div>
                <div className="min-w-0 rounded-xl bg-primary-soft p-3">
                  <p className="text-xs text-muted-foreground">Your share</p>
                  <p className="mt-1 text-base font-bold text-primary tabular sm:text-lg">
                    {formatNpr(myShareThisMonth)}
                  </p>
                </div>
              </div>
              {topCategories.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  No shared expenses yet this month.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {topCategories.map(([category, amount]) => (
                    <div key={category}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                        <span className="truncate font-medium">{category}</span>
                        <span className="shrink-0 text-muted-foreground tabular">
                          {formatNpr(amount)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(amount / sharedThisMonth) * 100}%`,
                            backgroundColor: CATEGORY_COLORS[category as Category] ?? "#64748b",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                <Link href="/reports">
                  Full report <ArrowRight />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Everyone's position */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Flatmates</CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-primary">
                <Link href="/balances">
                  Balances <ArrowRight />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="divide-y divide-border pt-0">
              {room.members
                .filter((m) => m.active)
                .map((m) => {
                  const net = balances.find((b) => b.userId === m.userId)?.net ?? 0;
                  return (
                    <div key={m.userId} className="flex items-center gap-3 py-2.5">
                      <Avatar name={m.name} color={m.avatarColor} size="sm" />
                      <p className="min-w-0 flex-1 truncate text-sm font-medium">
                        {m.userId === user.id ? "You" : m.name}
                      </p>
                      <p
                        className={cn(
                          "shrink-0 text-sm tabular",
                          net > 0 && "font-semibold text-positive",
                          net < 0 && "font-semibold text-negative",
                          net === 0 && "text-muted-foreground",
                        )}
                      >
                        {net > 0
                          ? `gets back ${formatNpr(net)}`
                          : net < 0
                            ? `owes ${formatNpr(-net)}`
                            : "settled"}
                      </p>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
