import type { Metadata } from "next";

import { AppProviders } from "@/components/AppProviders";

import "./globals.css";

export const metadata: Metadata = {
  title: "PickMe | ETH Bootcamp",
  description: "Fair participant picker for ETH Bootcamp live sessions",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-bootcamp text-slate-100" suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
