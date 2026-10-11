import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** Friendly placeholder for lists and pages with nothing to show yet. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary [&_svg]:size-6">
        {icon}
      </span>
      <div>
        <p className="font-semibold tracking-tight">{title}</p>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
