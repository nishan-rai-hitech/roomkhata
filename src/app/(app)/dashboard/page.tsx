import { CategoryIcon } from "@/components/expenses/category-icon";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat";
import { NoRoom } from "@/components/shell/no-room";
import { PageHeader } from "@/components/shell/page-header";
import { computeBalances, suggestSettlements } from "@/lib/balances";
import { formatNpr } from "@/lib/money";
import { getAppContext, getLedger, todayIn } from "@/lib/server/data";
import { bsMonthKey } from "@/lib/bs";
import { cn, formatDate, monthLabel } from "@/lib/utils";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  HandCoins,
  PartyPopper,
  Plus,
  Receipt,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const { user, room } = await getAppContext();
  if (!room) return <NoRoom title={`Hi, ${user.name.split(" ")[0]} 👋`} />;
  const { expenses, settlements } = await getLedger(room);

  const memberIds = room.members.map((m) => m.userId);
  const nameOf = (id: string) => room.members.find((m) => m.userId === id)?.name ?? "Unknown";
  const colorOf = (id: string) =>
    room.members.find((m) => m.userId === id)?.avatarColor ?? "#888";

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
  const youAreOwed = Math.max(me.net, 0);
  const youOwe = Math.max(-me.net, 0);

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

  return (
    <div>
      <PageHeader
        title={`Hi, ${user.name.split(" ")[0]} 👋`}
        subtitle={`${room.name} · ${monthLabel(monthKey)}`}
      />

      {/* Net balance hero */}
      <section className="relative mb-5 overflow-hidden rounded-2xl bg-sidebar p-6 text-white shadow-lg sm:p-8">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(32rem 20rem at 100% 0%, color-mix(in oklab, var(--sidebar-primary) 34%, transparent), transparent 70%), radial-gradient(24rem 16rem at 0% 100%, color-mix(in oklab, var(--sidebar-primary) 14%, transparent), transparent 70%)",
          }}
        />
        <div className="relative grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-sidebar-muted">
              <Wallet size={16} /> Your net balance
            </p>
            <p
              className={cn(
                "mt-2 text-4xl font-bold tracking-tight tabular sm:text-5xl",
                me.net > 0 && "text-sidebar-primary",
                me.net < 0 && "text-red-300",
              )}
            >
              {formatNpr(me.net, { sign: true })}
            </p>
            <p className="mt-2 text-sm text-sidebar-foreground">
              {me.net > 0
                ? "You are owed overall — you're a creditor in this room."
                : me.net < 0
                  ? "You owe overall — settle up to clear your balance."
                  : "You're all settled up. 🎉"}
            </p>
            {!room.archived && (
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  asChild
                  className="bg-sidebar-primary text-sidebar hover:bg-sidebar-primary/90"
                >
                  <Link href="/expenses/new">
                    <Plus /> Add expense
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/20"
                >
                  <Link href="/balances">
                    <HandCoins /> Settle up
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="text-sidebar-foreground hover:bg-white/10 hover:text-white dark:hover:bg-white/10"
                >
                  <Link href={`/rooms/${room.id}`}>
                    <UserPlus /> Invite
                  </Link>
                </Button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="flex items-center gap-1.5 text-xs text-sidebar-muted">
                <ArrowDownLeft size={14} className="text-sidebar-primary" /> You are owed
              </p>
              <p className="mt-1.5 text-xl font-bold tabular">{formatNpr(youAreOwed)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="flex items-center gap-1.5 text-xs text-sidebar-muted">
                <ArrowUpRight size={14} className="text-red-300" /> You owe
              </p>
              <p className="mt-1.5 text-xl font-bold tabular">{formatNpr(youOwe)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Month stats */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Shared spending this month"
          value={formatNpr(sharedThisMonth)}
          hint={`${monthExpenses.length} shared expenses`}
          icon={<Receipt size={16} />}
        />
        <StatCard
          label="Your share this month"
          value={formatNpr(myShareThisMonth)}
          hint={monthLabel(monthKey)}
          icon={<Wallet size={16} />}
        />
        <StatCard
          label="Room members"
          value={room.members.filter((m) => m.active).length}
          hint="active members"
          icon={<Users size={16} />}
        />
      </div>

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
                    <p className="text-xs text-muted-foreground">
                      {a.kind === "settlement" ? "Settlement" : `Paid by ${nameOf(a.payer)}`} ·{" "}
                      {formatDate(a.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular">{formatNpr(a.amount)}</p>
                    {a.personal && <Badge tone="neutral">Personal</Badge>}
                    {a.kind === "settlement" && <Badge tone="positive">Settled</Badge>}
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Settlement suggestions */}
        <Card>
          <CardHeader>
            <CardTitle>Settle up</CardTitle>
          </CardHeader>
          <CardContent>
            {mySuggestions.length === 0 ? (
              <EmptyState
                className="py-8"
                icon={<PartyPopper />}
                title="You're square"
                description="Nothing to settle right now."
              />
            ) : (
              <ul className="space-y-2">
                {mySuggestions.map((s, i) => {
                  const iPay = s.fromUserId === user.id;
                  const other = iPay ? s.toUserId : s.fromUserId;
                  return (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-xl border border-border p-3"
                    >
                      <Avatar name={nameOf(other)} color={colorOf(other)} size="sm" />
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="font-medium">
                          {iPay ? "Pay" : "Collect from"} {nameOf(other).split(" ")[0]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {iPay ? "You owe them" : "They owe you"}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-semibold tabular ${iPay ? "text-negative" : "text-positive"}`}
                      >
                        {formatNpr(s.amount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link href="/balances">
                Go to balances <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
