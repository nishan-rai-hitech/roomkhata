import { PageHeader } from "./page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DoorOpen } from "lucide-react";
import Link from "next/link";

/** Shown on room-scoped screens when the user isn't in any room yet. */
export function NoRoom({ title }: { title: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
            <DoorOpen size={22} />
          </span>
          <p className="max-w-sm text-sm text-muted">
            You&apos;re not in a room yet. Create one for your flat or join with an invite code to
            start tracking shared expenses.
          </p>
          <Link href="/rooms">
            <Button>Create or join a room</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
