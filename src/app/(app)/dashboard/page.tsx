import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat";
import { NoRoom } from "@/components/shell/no-room";
import { PageHeader } from "@/components/shell/page-header";
import { computeBalances, suggestSettlements } from "@/lib/balances";
import { formatNpr } from "@/lib/money";
import { getAppContext, getLedger, todayIn } from "@/lib/server/data";
import { formatDate, monthLabel } from "@/lib/utils";
import { ArrowRight, Receipt, TrendingDown, TrendingUp } from "lucide-react";
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

  // The current month in the room's own timezone.
  const monthKey = todayIn(room.timezone).slice(0, 7);
  const monthExpenses = expenses.filter((e) => !e.isPersonal && e.date.startsWith(monthKey));
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
      date: e.date,
      createdAt: e.createdAt,
      title: e.title,
      payer: e.payerId,
      amount: e.amount,
      personal: e.isPersonal,
    })),
    ...settlements.map((s) => ({
      kind: "settlement" as const,
      id: s.id,
      date: s.date,
      createdAt: s.createdAt,
      title: `${nameOf(s.fromUserId)} paid ${nameOf(s.toUserId)}`,
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
        actions={
          !room.archived && (
            <Link href="/expenses/new">
              <Button>Add expense</Button>
            </Link>
          )
        }
      />

      {/* Net balance hero */}
      <Card className="mb-5 overflow-hidden">
        <div className="grid gap-px bg-border sm:grid-cols-[1.4fr_1fr_1fr]">
          <div className="bg-surface p-6">
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
                ? "You are owed overall — you're a creditor in this room."
                : me.net < 0
                  ? "You owe overall — settle up to clear your balance."
                  : "You're all settled up. 🎉"}
            </p>
          </div>
          <div className="bg-surface p-6">
            <p className="flex items-center gap-1.5 text-sm text-muted">
              <TrendingUp size={15} className="text-positive" /> You are owed
            </p>
            <p className="mt-1 text-2xl font-bold tabular text-positive">{formatNpr(youAreOwed)}</p>
          </div>
          <div className="bg-surface p-6">
            <p className="flex items-center gap-1.5 text-sm text-muted">
              <TrendingDown size={15} className="text-negative" /> You owe
            </p>
            <p className="mt-1 text-2xl font-bold tabular text-negative">{formatNpr(youOwe)}</p>
          </div>
        </div>
      </Card>

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
        />
        <StatCard
          label="Room members"
          value={room.members.filter((m) => m.active).length}
          hint="active members"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        {/* Recent activity */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Recent activity</CardTitle>
            <Link href="/expenses" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {activity.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">
                Nothing yet. Add your first expense to get started.
              </p>
            )}
            {activity.map((a) => (
              <div key={`${a.kind}-${a.id}`} className="flex items-center gap-3 py-3">
                <Avatar name={nameOf(a.payer)} color={colorOf(a.payer)} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted">
                    {a.kind === "settlement" ? "Settlement" : `Paid by ${nameOf(a.payer)}`} ·{" "}
                    {formatDate(a.date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular">{formatNpr(a.amount)}</p>
                  {a.personal && <Badge tone="neutral">Personal</Badge>}
                  {a.kind === "settlement" && <Badge tone="positive">Settled</Badge>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Settlement suggestions */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Settle up</CardTitle>
            <Link href="/balances" className="text-sm font-medium text-primary hover:underline">
              Balances
            </Link>
          </CardHeader>
          <CardContent>
            {mySuggestions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">
                Nothing to settle right now. You&apos;re square. 🎉
              </p>
            ) : (
              <ul className="space-y-2">
                {mySuggestions.map((s, i) => {
                  const iPay = s.fromUserId === user.id;
                  const other = iPay ? s.toUserId : s.fromUserId;
                  return (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-lg border border-border p-3"
                    >
                      <Avatar name={nameOf(other)} color={colorOf(other)} size="sm" />
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="font-medium">
                          {iPay ? "Pay" : "Collect from"} {nameOf(other).split(" ")[0]}
                        </p>
                        <p className="text-xs text-muted">
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
            <Link href="/balances">
              <Button variant="outline" size="sm" className="mt-4 w-full">
                Go to balances <ArrowRight size={15} />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
