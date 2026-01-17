"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { NAV_LINKS } from "./navigation";
import { Button } from "@/ui/button";
import { Avatar, AvatarFallback } from "@/ui/avatar";
import { useAuth } from "../../lib/hooks/use-auth";
import { cn } from "../../lib/utils/helpers";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();

  const initials = `${user?.first_name?.charAt(0) ?? "A"}${user?.last_name?.charAt(0) ?? "C"}`.toUpperCase();
  const readableRole = `${(user?.role ?? "farmer").replace(/_/g, " ")}`;

  return (
    <aside
      className={cn(
        "relative hidden h-screen border-r border-border/40 bg-white/80 backdrop-blur lg:flex lg:flex-col",
        collapsed ? "w-20" : "w-72",
      )}
    >
      <div className="flex items-center justify-between px-4 py-5">
        {!collapsed && (
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-foreground/50">Workspace</p>
            <p className="text-lg font-semibold text-foreground">Command Center</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((prev) => !prev)}
          className="rounded-full border border-border/40"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" aria-hidden /> : <ChevronLeft className="h-4 w-4" aria-hidden />}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_LINKS.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-foreground/70 transition hover:bg-accent/10",
                isActive && "bg-accent/15 text-foreground",
                collapsed && "justify-center",
              )}
            >
              <item.icon className="h-4 w-4" aria-hidden />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/50 px-4 py-5">
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-white/90 p-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div>
              <p className="text-sm font-semibold text-foreground">{user?.first_name ? `${user.first_name} ${user.last_name ?? ""}` : "Agri User"}</p>
              <p className="text-xs text-foreground/60">{readableRole.charAt(0).toUpperCase() + readableRole.slice(1)}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
