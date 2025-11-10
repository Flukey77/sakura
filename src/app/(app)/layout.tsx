import type { ReactNode } from "react";
import Sidebar from "@/app/components/Sidebar";
import Header from "./_components/Header";
import { MobileTopBar, MobileTabBar } from "@/app/components/MobileNav";

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
        {/* แถบบนเฉพาะมือถือ */}
        <MobileTopBar />

        {/* เดสก์ท็อปเฮดเดอร์ */}
        <div className="hidden md:block">
          <Header />
        </div>

        {/* เผื่อพื้นที่ให้แถบล่างบนมือถือ (pb-16) */}
        <main className="flex-1 mx-auto w-full max-w-[1400px] px-3 sm:px-4 py-6 pb-16 overflow-x-hidden">
          {children}
        </main>

        {/* แถบนำทางล่างเฉพาะมือถือ */}
        <MobileTabBar />
      </div>
    </div>
  );
}
