import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "neutral" | "positive" | "negative";
}) {
  const valueColor =
    tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-foreground";
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{label}</p>
        {icon && <span className="text-muted">{icon}</span>}
      </div>
      <p className={cn("mt-2 text-2xl font-bold tabular", valueColor)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
