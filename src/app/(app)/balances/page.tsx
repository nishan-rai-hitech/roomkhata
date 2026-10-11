import { BalancesView } from "@/components/balances/balances-view";
import { NoRoom } from "@/components/shell/no-room";
import { getAppContext, getLedger, todayIn } from "@/lib/server/data";

export default async function BalancesPage() {
  const { user, room } = await getAppContext();
  if (!room) return <NoRoom title="Balances" />;
  const { expenses, settlements } = await getLedger(room);
  return (
    <BalancesView
      room={room}
      currentUserId={user.id}
      expenses={expenses}
      settlements={settlements}
      today={todayIn(room.timezone)}
    />
  );
}
