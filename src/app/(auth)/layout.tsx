// src/app/(auth)/layout.tsx
import "@/app/globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Sakura  Auth",
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50">
        <main className="min-h-screen grid place-items-center p-4">
          {children}
        </main>
      </body>
    </html>
  );
}
