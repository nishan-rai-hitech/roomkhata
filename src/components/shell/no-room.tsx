import { PageHeader } from "./page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DoorOpen } from "lucide-react";
import Link from "next/link";

/** Shown on room-scoped screens when the user isn't in any room yet. */
export function NoRoom({ title }: { title: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <Card>
        <EmptyState
          className="py-16"
          icon={<DoorOpen />}
          title="You're not in a room yet"
          description="Create one for your flat or join with an invite code to start tracking shared expenses."
          action={
            <Button asChild>
              <Link href="/rooms">Create or join a room</Link>
            </Button>
          }
        />
      </Card>
    </div>
  );
}
