import type { LucideIcon } from "lucide-react";
import { Boxes, LayoutDashboard, ShoppingBag, Sprout } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_LINKS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Farms", href: "/farms", icon: Sprout },
  { label: "Marketplace", href: "/marketplace", icon: ShoppingBag },
  { label: "Inventory", href: "/inventory", icon: Boxes },
];
