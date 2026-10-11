import { RoomDetail } from "@/components/rooms/room-detail";
import { getAppContext, getLedger, getRoomForUser, getRoomInvites } from "@/lib/server/data";
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
  // Only the people who can invite get to see who has been invited.
  const myRole = room.members.find((m) => m.userId === user.id && m.active)?.role;
  const invites = myRole === "owner" || myRole === "admin" ? await getRoomInvites(room.id) : [];

  return (
    <RoomDetail
      room={room}
      currentUserId={user.id}
      expenses={expenses}
      settlements={settlements}
      invites={invites}
    />
  );
}
