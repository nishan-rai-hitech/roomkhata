import {
  LayoutDashboard,
  Receipt,
  Scale,
  Users,
  FileBarChart,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Expenses", href: "/expenses", icon: Receipt },
  { label: "Balances", href: "/balances", icon: Scale },
  { label: "Rooms", href: "/rooms", icon: Users },
  { label: "Reports", href: "/reports", icon: FileBarChart },
  { label: "Settings", href: "/settings", icon: Settings },
];
