// src/app/(app)/layout.tsx
import type { ReactNode } from "react";
import Sidebar from "@/app/components/Sidebar";
import Header from "./_components/Header";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sakura" };

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar: ซ่อนบนมือถือ */}
      <aside className="hidden md:block md:w-64 shrink-0">
        <Sidebar />
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* เฮดเดอร์เดสก์ท็อป (มือถือจะไม่เห็นอยู่แล้ว) */}
        <div className="hidden md:block">
          <Header />
        </div>

        {/* เนื้อหา – เอา pb-16 (เผื่อพื้นที่แท็บล่าง) ออก */}
        <main className="flex-1 mx-auto w/full max-w-[1400px] px-3 sm:px-4 py-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
