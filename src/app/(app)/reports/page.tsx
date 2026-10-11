import { ReportsView } from "@/components/reports/reports-view";
import { NoRoom } from "@/components/shell/no-room";
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
      currentMonth={todayIn(room.timezone).slice(0, 7)}
    />
  );
}
