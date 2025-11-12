// src/app/(auth)/layout.tsx
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sakura – Login" };

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    // ใช้ทั้ง 100svh และ 100dvh กันปัญหา webview/แถบระบบมือถือ
    <div className="min-h-[100svh] min-h-[100dvh] bg-slate-50 flex items-center justify-center px-4">
      {/* ให้มี max-width เพื่ออ่านง่าย และเว้นระยะบน/ล่างเผื่อคีย์บอร์ดเด้งขึ้น */}
      <div className="w-full max-w-sm my-6">{children}</div>
    </div>
  );
}
