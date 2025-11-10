// src/app/layout.tsx
import "@/app/globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import ClientProviders from "@/app/ClientProviders";

export const metadata: Metadata = { title: "Sakura" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
