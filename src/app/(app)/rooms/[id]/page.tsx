import { RoomDetail } from "@/components/rooms/room-detail";
import { getAppContext, getLedger, getRoomForUser } from "@/lib/server/data";
import { notFound } from "next/navigation";

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const room = await getRoomForUser(id);
  if (!room) notFound();

  const { user } = await getAppContext();
  const { expenses, settlements } = await getLedger(room);

  return (
    <RoomDetail
      room={room}
      currentUserId={user.id}
      expenses={expenses}
      settlements={settlements}
    />
  );
}
