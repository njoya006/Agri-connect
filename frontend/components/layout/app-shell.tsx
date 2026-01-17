"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { Footer } from "./footer";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { ProtectedRoute } from "@/shared/protected-route";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/forgot-password"];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname ?? "/");

  if (isPublicRoute) {
    return <div className="min-h-screen bg-gradient-to-br from-surface via-background to-surface/40">{children}</div>;
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-background/60">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <Header />
          <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
          <Footer />
        </div>
      </div>
    </ProtectedRoute>
  );
}
