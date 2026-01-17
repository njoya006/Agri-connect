import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "react-hot-toast";

import { AppShell } from "@/layout/app-shell";
import { AppProviders } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "AgriConnect | Intelligent Farm Management",
  description:
    "AgriConnect empowers growers with analytics, planning tools, and collaborative marketplaces.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans bg-background text-foreground`}>
        <AppProviders>
          <AppShell>{children}</AppShell>
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
          {isDev && <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />}
        </AppProviders>
      </body>
    </html>
  );
}
