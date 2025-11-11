// src/app/layout.tsx
import "@/app/globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import ClientProviders from "@/app/ClientProviders";

export const metadata: Metadata = {
  title: "Sakura",
};

// ย้าย viewport ออกมาเป็น export แยกตามสเปค App Router
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning className="h-full">
      <body className="min-h-screen h-full bg-slate-50 overflow-x-hidden">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
