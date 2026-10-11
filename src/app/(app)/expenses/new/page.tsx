import { ExpenseForm } from "@/components/expenses/expense-form";
import { NoRoom } from "@/components/shell/no-room";
import { getAppContext, todayIn } from "@/lib/server/data";
import { redirect } from "next/navigation";

export default async function NewExpensePage() {
  const { user, room } = await getAppContext();
  if (!room) return <NoRoom title="Add expense" />;
  // Archived rooms are read-only.
  if (room.archived) redirect("/expenses");
  return (
    <ExpenseForm
      roomName={room.name}
      members={room.members.filter((m) => m.active)}
      currentUserId={user.id}
      today={todayIn(room.timezone)}
    />
  );
}
