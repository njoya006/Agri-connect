import type { Metadata } from "next";
import Link from "next/link";
import * as React from "react";

export const metadata: Metadata = {
  title: "AgriConnect | Secure Access",
  description: "Sign in to manage farms, marketplaces, and analytics on AgriConnect.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-lime-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.15),_transparent_60%)]" aria-hidden />
      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        <div className="flex flex-1 flex-col justify-between bg-gradient-to-br from-emerald-600 via-emerald-500 to-lime-500 p-8 text-white">
          <div>
            <Link href="/" className="inline-flex items-center gap-3 text-2xl font-semibold tracking-tight">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold text-emerald-600">
                AC
              </span>
              AgriConnect
            </Link>
            <p className="mt-6 max-w-md text-base text-white/80">
              Connect farmers, buyers, and analysts in one intelligent workspace. Monitor production, inventory, and market trends with real-time insights.
            </p>
          </div>
          <div className="mt-12 text-sm text-white/70">
            Empowering resilient food systems since 2024.
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md rounded-3xl bg-white/80 p-1 shadow-2xl ring-1 ring-black/5 backdrop-blur">
            <div className="rounded-[1.35rem] bg-white/90 p-6 shadow-inner">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
