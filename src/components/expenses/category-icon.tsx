import { CATEGORY_COLORS } from "@/lib/constants";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Bus,
  HandCoins,
  Home,
  ShoppingBasket,
  Sofa,
  Tag,
  Utensils,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<Category, LucideIcon> = {
  Groceries: ShoppingBasket,
  Rent: Home,
  Utilities: Zap,
  Internet: Wifi,
  Dining: Utensils,
  Transport: Bus,
  Household: Sofa,
  Other: Tag,
};

/** Tinted tile with the icon for an expense category (or a settlement). */
export function CategoryIcon({
  category,
  className,
}: {
  category: string | "settlement";
  className?: string;
}) {
  const settlement = category === "settlement";
  const Icon = settlement ? HandCoins : (ICONS[category as Category] ?? Tag);
  const color = settlement ? "var(--positive)" : (CATEGORY_COLORS[category as Category] ?? "#64748b");
  return (
    <span
      className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", className)}
      style={{ backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`, color }}
    >
      <Icon size={18} />
    </span>
  );
}
