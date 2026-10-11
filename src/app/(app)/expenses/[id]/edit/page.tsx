import { ExpenseForm } from "@/components/expenses/expense-form";
import { getAppContext, getExpenseForUser, todayIn } from "@/lib/server/data";
import { notFound, redirect } from "next/navigation";

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const found = await getExpenseForUser(id);
  if (!found) notFound();
  const { expense, room } = found;
  const { user } = await getAppContext();

  // Same rule the update action enforces: creator, payer, or a room owner/admin.
  const role = room.members.find((m) => m.userId === user.id)?.role ?? "member";
  const canEdit =
    expense.createdById === user.id || expense.payerId === user.id || role !== "member";
  if (!canEdit || room.archived) redirect(`/expenses/${id}`);

  // Active members, plus anyone already on the record (they may have left since).
  const onRecord = new Set([expense.payerId, ...expense.shares.map((s) => s.userId)]);
  return (
    <ExpenseForm
      roomName={room.name}
      members={room.members.filter((m) => m.active || onRecord.has(m.userId))}
      currentUserId={user.id}
      today={todayIn(room.timezone)}
      initial={expense}
    />
  );
}
