import { getAppContext, getLedgers, getUserSettings } from "@/lib/server/data";
import { getCurrentUser } from "@/lib/server/session";

/** Download everything the signed-in user can see, as one JSON file. */
export async function GET() {
  if (!(await getCurrentUser())) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  const { user, rooms } = await getAppContext();
  const [ledgers, settings] = await Promise.all([getLedgers(rooms), getUserSettings()]);

  const body = {
    exportedAt: new Date().toISOString(),
    note: "All amounts are integer paisa (1 rupee = 100 paisa).",
    user: { ...user, ...settings },
    rooms: rooms.map((room) => ({ ...room, ...ledgers.get(room.id) })),
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="roomkhata-export-${body.exportedAt.slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
