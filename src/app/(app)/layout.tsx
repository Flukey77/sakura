// src/app/(app)/layout.tsx
import type { ReactNode } from "react";
import Sidebar from "@/app/components/Sidebar";
import Header from "./_components/Header";
export const dynamic = "force-dynamic";
export const revalidate = false;
export const metadata = { title: "Sakura" };

export default function AppLayout({ children }: { children: ReactNode }) {
  // ❌ ห้ามมี <html>/<body> ใน layout ย่อย
  return (
    <div className="min-h-screen flex">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 mx-auto max-w-[1400px] px-4 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
