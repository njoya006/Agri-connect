"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, LogOut, User2, ShoppingCart } from "lucide-react";
import { Bell } from "lucide-react";
import { useMemo, useEffect, useState } from "react";

import { NAV_LINKS } from "./navigation";
import { Button } from "@/ui/button";
import { Avatar, AvatarFallback } from "@/ui/avatar";
import { useAuth } from "../../lib/hooks/use-auth";
import { cn } from "../../lib/utils/helpers";
import { getCart } from "@/lib/cart";

export function Header() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-border/40 bg-white/80 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-4 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-3 text-lg font-semibold text-foreground">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-base font-bold text-accent">
            AC
          </span>
          <span className="hidden sm:inline">AgriConnect</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-foreground/70 md:flex">
          {NAV_LINKS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "transition hover:text-foreground",
                  isActive ? "text-foreground" : "text-foreground/60",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <MobileNav />
          <NotificationsButton />
          <CartButton />
          <UserDropdown userName={user?.first_name ?? "Agri User"} role={user?.role ?? "farmer"} />
        </div>
      </div>
    </header>
  );
}

function NotificationsButton() {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    const fetchCount = async () => {
      try {
        // fetch notifications for current user and count unread
        const resp = await (await import('@/lib/api/client')).default.get('/notifications/');
        const data = resp.data?.results ?? resp.data ?? [];
        if (!mounted) return;
        const unread = (data as any[]).filter((n) => !n.is_read).length;
        setCount(unread);
      } catch (e) {
        // ignore
      }
    };
    fetchCount();
    const onStorage = () => fetchCount();
    window.addEventListener('storage', onStorage);
    return () => {
      mounted = false;
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return (
    <Link href="/notifications" className="relative">
      <button aria-label="Notifications" className="inline-flex items-center justify-center rounded-full p-2 hover:bg-accent/10">
        <Bell className="h-5 w-5 text-foreground/70" />
      </button>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 inline-flex items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}

function CartButton() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => {
      const items = getCart();
      const total = items.reduce((s, i) => s + Number(i.quantity), 0);
      setCount(total);
    };
    update();
    const onStorage = (e: StorageEvent) => {
      if (e.key === undefined || e.key === null) return;
      if (e.key.includes('agri_cart_v1') || e.key.includes('agri_notifications_v1')) update();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <Link href="/marketplace/checkout" className="relative">
      <button aria-label="View cart" className="inline-flex items-center justify-center rounded-full p-2 hover:bg-accent/10">
        <ShoppingCart className="h-5 w-5 text-foreground/70" />
      </button>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 inline-flex items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-xs font-semibold text-accent-foreground">
          {count}
        </span>
      )}
    </Link>
  );
}

function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open navigation menu">
            <Menu className="h-5 w-5" aria-hidden />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-56 rounded-2xl border border-border/40 bg-white/95 p-2 shadow-2xl backdrop-blur"
        >
          {NAV_LINKS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <DropdownMenu.Item key={item.href} asChild className="rounded-xl outline-none data-[highlighted]:bg-accent/10">
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium",
                    isActive ? "text-foreground" : "text-foreground/70",
                  )}
                >
                  <item.icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </Link>
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
}

function UserDropdown({ userName, role }: { userName: string; role: string }) {
  const router = useRouter();
  const { logout, user } = useAuth();

  const initials = useMemo(() => {
    if (!user) return userName.substring(0, 2).toUpperCase();
    const first = user.first_name?.charAt(0) ?? "A";
    const last = user.last_name?.charAt(0) ?? "C";
    return `${first}${last}`.toUpperCase();
  }, [user, userName]);

  const roleSource = user?.role ?? role;
  const formattedRole = useMemo(() => {
    const readable = roleSource.replace(/_/g, " ");
    return readable.charAt(0).toUpperCase() + readable.slice(1);
  }, [roleSource]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="inline-flex items-center gap-3 rounded-full border border-border/60 bg-white/70 px-2 py-1 text-left text-sm shadow-sm transition hover:border-border">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-semibold text-foreground">{user?.first_name || userName}</p>
            <p className="text-xs uppercase tracking-wide text-foreground/60">{formattedRole}</p>
          </div>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align="end"
        sideOffset={12}
        className="z-50 w-64 rounded-2xl border border-border/40 bg-white/95 p-3 text-sm shadow-2xl backdrop-blur"
      >
        <div className="mb-3 flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-base font-semibold text-foreground">{user?.first_name || userName}</p>
            <p className="text-xs text-foreground/70">{user?.email ?? "you@example.com"}</p>
            <p className="text-xs text-foreground/60">Role: {formattedRole}</p>
          </div>
        </div>
        <DropdownMenu.Separator className="my-2 h-px bg-border/60" />
        <DropdownMenu.Item asChild className="rounded-xl outline-none data-[highlighted]:bg-accent/10">
          <Link href="/profile" className="flex items-center gap-2 px-3 py-2 text-foreground">
            <User2 className="h-4 w-4" aria-hidden />
            View profile
          </Link>
        </DropdownMenu.Item>
        <DropdownMenu.Item
          className="mt-1 flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-red-600 outline-none transition data-[highlighted]:bg-red-50"
          onSelect={(event) => {
            event.preventDefault();
            void handleLogout();
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Logout
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
