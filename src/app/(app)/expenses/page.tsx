import { ExpenseList } from "@/components/expenses/expense-list";
import { NoRoom } from "@/components/shell/no-room";
import { getAppContext, getLedger } from "@/lib/server/data";

export default async function ExpensesPage() {
  const { user, room } = await getAppContext();
  if (!room) return <NoRoom title="Expenses" />;
  const { expenses } = await getLedger(room);
  return <ExpenseList room={room} currentUserId={user.id} expenses={expenses} />;
}
