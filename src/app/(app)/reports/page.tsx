import { ReportsView } from "@/components/reports/reports-view";
import { NoRoom } from "@/components/shell/no-room";
import { bsMonthKey } from "@/lib/bs";
import { getAppContext, getLedger, todayIn } from "@/lib/server/data";

export default async function ReportsPage() {
  const { user, room } = await getAppContext();
  if (!room) return <NoRoom title="Reports" />;
  const { expenses } = await getLedger(room);
  return (
    <ReportsView
      room={room}
      currentUserId={user.id}
      expenses={expenses}
      currentMonth={bsMonthKey(todayIn(room.timezone))}
    />
  );
}
