import { cn } from "@/lib/utils";

/** RoomKhata wordmark + ledger glyph. */
export function Logo({
  className,
  showText = true,
  size = 32,
}: {
  className?: string;
  showText?: boolean;
  size?: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
        className="shrink-0"
      >
        <rect width="32" height="32" rx="9" fill="var(--primary)" />
        {/* roof */}
        <path d="M8 15 L16 9 L24 15" stroke="var(--primary-fg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* ledger lines */}
        <path d="M11 18 H21" stroke="var(--primary-fg)" strokeWidth="2" strokeLinecap="round" opacity="0.95" />
        <path d="M11 22 H18" stroke="var(--primary-fg)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      </svg>
      {showText && (
        <span className="text-lg font-bold tracking-tight">
          Room<span className="text-primary">Khata</span>
        </span>
      )}
    </span>
  );
}
