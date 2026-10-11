import { cn, initials } from "@/lib/utils";

interface AvatarProps {
  name: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
};

export function Avatar({ name, color = "#4f46e5", size = "md", className }: AvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0",
        sizes[size],
        className,
      )}
      style={{ backgroundColor: color }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}
