import {
  LayoutDashboard,
  Receipt,
  Scale,
  Users,
  FileBarChart,
  Settings,
  ShieldCheck,
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

/** Only shown to platform admins (see ADMIN_EMAILS). */
export const adminNavItem: NavItem = { label: "Admin", href: "/admin", icon: ShieldCheck };
