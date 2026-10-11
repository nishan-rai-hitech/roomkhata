import { PageHeader } from "./page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Hammer } from "lucide-react";

export function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Hammer size={22} />
          </span>
          <p className="max-w-sm text-sm text-muted">{note}</p>
        </CardContent>
      </Card>
    </div>
  );
}
