import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/page-header";
import { ExpenseActions } from "@/components/expenses/expense-actions";
import { SPLIT_METHODS } from "@/lib/constants";
import { formatNpr } from "@/lib/money";
import { getAppContext, getExpenseForUser } from "@/lib/server/data";
import { formatDate } from "@/lib/utils";
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
  const nameOf = (uid: string) => member(uid)?.name ?? "Unknown";
  const methodLabel = SPLIT_METHODS.find((m) => m.value === e.splitMethod)?.label ?? e.splitMethod;
  // Same rule the actions enforce: creator, payer, or a room owner/admin.
  const canEdit =
    !room.archived &&
    (e.createdById === user.id || e.payerId === user.id || member(user.id)?.role !== "member");

  return (
    <div>
      <PageHeader
        title={e.title}
        subtitle={
          <>
            {room.name} · {e.category} · {formatDate(e.date)} {e.isPersonal && "· Personal"}
          </>
        }
        actions={
          <>
            <Link href="/expenses">
              <Button variant="ghost">← Back</Button>
            </Link>
            {canEdit && <ExpenseActions id={e.id} />}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>{e.isPersonal ? "Charged to" : "Split breakdown"}</CardTitle>
            {!e.isPersonal && <Badge tone="primary">{methodLabel}</Badge>}
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {e.shares.map((s) => {
              const m = member(s.userId);
              const pct = ((s.amount / e.amount) * 100).toFixed(1);
              return (
                <div key={s.userId} className="flex items-center gap-3 py-3">
                  <Avatar name={nameOf(s.userId)} color={m?.avatarColor} size="sm" />
                  <span className="flex-1 text-sm">{nameOf(s.userId)}</span>
                  {!e.isPersonal && <span className="text-xs text-muted tabular">{pct}%</span>}
                  <span className="w-28 text-right text-sm font-semibold tabular">
                    {formatNpr(s.amount)}
                  </span>
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
            <div className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
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
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
