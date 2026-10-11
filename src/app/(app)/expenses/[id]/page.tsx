import { CategoryIcon } from "@/components/expenses/category-icon";
import { ExpenseActions } from "@/components/expenses/expense-actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SPLIT_METHODS } from "@/lib/constants";
import { formatNpr } from "@/lib/money";
import { getAppContext, getExpenseForUser } from "@/lib/server/data";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const found = await getExpenseForUser(id);
  if (!found) notFound();
  const { expense: e, room } = found;
  const { user } = await getAppContext();

  const member = (uid: string) => room.members.find((m) => m.userId === uid);
  const nameOf = (uid: string) =>
    uid === user.id ? "You" : (member(uid)?.name ?? "Unknown");
  const methodLabel = SPLIT_METHODS.find((m) => m.value === e.splitMethod)?.label ?? e.splitMethod;
  // Same rule the actions enforce: creator, payer, or a room owner/admin.
  const canEdit =
    !room.archived &&
    (e.createdById === user.id || e.payerId === user.id || member(user.id)?.role !== "member");

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link href="/expenses">
            <ArrowLeft /> All expenses
          </Link>
        </Button>
        {canEdit && (
          <div className="flex items-center gap-2">
            <ExpenseActions id={e.id} />
          </div>
        )}
      </div>

      {/* Summary */}
      <Card className="mb-5">
        <CardContent className="flex flex-wrap items-center gap-4 p-6">
          <CategoryIcon category={e.category} className="size-14 rounded-2xl [&_svg]:size-6" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold tracking-tight">{e.title}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              {room.name} · {e.category} · {formatDate(e.date)}
              {e.isPersonal && <Badge tone="neutral">Personal</Badge>}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold tracking-tight tabular">{formatNpr(e.amount)}</p>
            <p className="mt-1 text-sm text-muted-foreground">paid by {nameOf(e.payerId)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>{e.isPersonal ? "Charged to" : "Split breakdown"}</CardTitle>
            {!e.isPersonal && <Badge tone="primary">{methodLabel}</Badge>}
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {e.shares.map((s) => {
              const m = member(s.userId);
              const pct = (s.amount / e.amount) * 100;
              return (
                <div key={s.userId} className="py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={m?.name ?? "Unknown"} color={m?.avatarColor} size="sm" />
                    <span className="flex-1 truncate text-sm font-medium">{nameOf(s.userId)}</span>
                    {!e.isPersonal && (
                      <span className="text-xs text-muted-foreground tabular">
                        {pct.toFixed(1)}%
                      </span>
                    )}
                    <span className="w-28 text-right text-sm font-semibold tabular">
                      {formatNpr(s.amount)}
                    </span>
                  </div>
                  {!e.isPersonal && <Progress value={pct} className="mt-2 h-1.5" />}
                </div>
              );
            })}
            <div className="flex items-center justify-between py-3">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-sm font-bold tabular">{formatNpr(e.amount)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Detail label="Amount" value={formatNpr(e.amount)} />
            <Detail label="Paid by" value={nameOf(e.payerId)} />
            <Detail label="Entered by" value={nameOf(e.createdById)} />
            <Detail label="Date" value={formatDate(e.date)} />
            <Detail label="Category" value={e.category} />
            <Detail label="Type" value={e.isPersonal ? "Personal" : "Shared"} />
            <Detail label="Split method" value={methodLabel} />
            {e.note && <Detail label="Note" value={e.note} />}
            <div className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground">
              <ShieldCheck size={15} className="mt-px shrink-0 text-primary" />
              Amounts are stored as exact paisa. Edits keep the original values, actor, and
              timestamp in the audit log.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
