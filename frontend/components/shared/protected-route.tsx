"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef } from "react";

import { useAuth } from "../../lib/hooks/use-auth";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, checkAuth } = useAuth();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (!hasCheckedRef.current) {
      hasCheckedRef.current = true;
      void checkAuth();
    }
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && hasCheckedRef.current && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-sm text-foreground/70">
        <Loader2 className="h-6 w-6 animate-spin text-accent" aria-hidden />
        <p>Securing your AgriConnect workspace…</p>
      </div>
    );
  }

  return <>{children}</>;
}
