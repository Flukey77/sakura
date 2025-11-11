// src/app/layout.tsx
import "@/app/globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import ClientProviders from "@/app/ClientProviders";

export const metadata: Metadata = {
  title: "Sakura",
  description: "Sakura Sales & Inventory",
  icons: { icon: "/favicon.ico" },
};

// ทำให้เหมาะกับมือถือ: scale 1, ปิด zoom gesture ที่ไม่ตั้งใจ, edge-color
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning className="h-full">
      <body className="min-h-screen h-full bg-slate-50 overflow-x-hidden touch-manipulation">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
