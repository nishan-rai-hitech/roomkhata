import { RoomsView } from "@/components/rooms/rooms-view";
import { computeBalances } from "@/lib/balances";
import { getAppContext, getLedgers, getPendingInvites } from "@/lib/server/data";

export default async function RoomsPage() {
  const { user, rooms } = await getAppContext();
  const [ledgers, invites] = await Promise.all([getLedgers(rooms), getPendingInvites()]);

  // The signed-in user's net balance in each room.
  const nets: Record<string, number> = {};
  for (const room of rooms) {
    const ledger = ledgers.get(room.id)!;
    const balances = computeBalances(
      room.members.map((m) => m.userId),
      ledger.expenses,
      ledger.settlements,
    );
    nets[room.id] = balances.find((b) => b.userId === user.id)?.net ?? 0;
  }

  return <RoomsView rooms={rooms} nets={nets} invites={invites} />;
}
