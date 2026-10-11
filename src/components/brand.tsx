import { cn } from "@/lib/utils";

/** RoomKhata wordmark + ledger glyph. `inverted` is for the dark forest surfaces. */
export function Logo({
  className,
  showText = true,
  size = 32,
  inverted = false,
}: {
  className?: string;
  showText?: boolean;
  size?: number;
  inverted?: boolean;
}) {
  const fill = inverted ? "var(--sidebar-primary)" : "var(--primary)";
  const stroke = inverted ? "var(--sidebar)" : "var(--primary-foreground)";
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
        <rect width="32" height="32" rx="9" fill={fill} />
        {/* roof */}
        <path d="M8 15 L16 9 L24 15" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* ledger lines */}
        <path d="M11 18 H21" stroke={stroke} strokeWidth="2" strokeLinecap="round" opacity="0.95" />
        <path d="M11 22 H18" stroke={stroke} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      </svg>
      {showText && (
        <span className="text-lg font-bold tracking-tight">
          Room<span className={inverted ? "text-sidebar-primary" : "text-primary"}>Khata</span>
        </span>
      )}
    </span>
  );
}
