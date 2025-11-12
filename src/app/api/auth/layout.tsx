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
    <html lang="th" suppressHydrationWarning className="h-full">
      <body className="h-full min-h-dvh bg-slate-50">
        <ClientProviders>
          <main className="min-h-dvh grid place-items-center p-4">
            <div className="w-full max-w-md">{children}</div>
          </main>
        </ClientProviders>
      </body>
    </html>
  );
}
