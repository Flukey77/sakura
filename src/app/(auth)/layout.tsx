// src/app/(auth)/layout.tsx
import "@/app/globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import ClientProviders from "@/app/ClientProviders";

export const metadata: Metadata = {
  title: "Sakura — Auth",
  description: "Sign in to Sakura",
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50">
        <ClientProviders>
          {/* mobile-first: padding 16, max-w-md ตรงกลาง, card ไม่ล้นขอบจอ */}
          <main className="min-h-screen grid place-items-center p-4">
            <div className="w-full max-w-md">{children}</div>
          </main>
        </ClientProviders>
      </body>
    </html>
  );
}
