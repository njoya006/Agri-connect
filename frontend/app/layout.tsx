import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
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
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans bg-background text-foreground`}>
        <AppProviders>
          <div className="min-h-screen bg-gradient-to-br from-surface via-background to-surface/40">
            {children}
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
