import { AppShell } from "@/components/shell/app-shell";
import { getAppContext } from "@/lib/server/data";
import { Suspense, type ReactNode } from "react";

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  // The session is read at request time, so the whole signed-in area streams
  // in behind this boundary (pages below may read cookies and params freely).
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted">
          Loading…
        </div>
      }
    >
      <AuthedShell>{children}</AuthedShell>
    </Suspense>
  );
}

async function AuthedShell({ children }: { children: ReactNode }) {
  const { user, rooms, room } = await getAppContext();
  return (
    <AppShell
      user={user}
      rooms={rooms.map((r) => ({ id: r.id, name: r.name, archived: r.archived }))}
      currentRoomId={room?.id ?? null}
    >
      {children}
    </AppShell>
  );
}
