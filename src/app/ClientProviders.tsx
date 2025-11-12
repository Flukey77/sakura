"use client";

import { useEffect, useRef } from "react";
import { SessionProvider } from "next-auth/react";
import ToastProvider, { useToast } from "@/app/components/ToastProvider";

/** แสดงข้อความจาก ?toast=... “ครั้งเดียว” แล้วลบ query ออกจาก URL */
function QueryToastOnce() {
  const shownRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;

    try {
      const url = new URL(window.location.href);
      const key = url.searchParams.get("toast");
      if (key) {
        // คุณจะ map คีย์อื่น ๆ เพิ่มได้ที่นี่
        if (key === "login_ok") toast.success("ล็อกอินสำเร็จ!");
        if (key === "logout_ok") toast.info("ออกจากระบบเรียบร้อย");

        // ลบพารามิเตอร์เพื่อกันการแสดงซ้ำเวลามี re-render/route change
        url.searchParams.delete("toast");
        window.history.replaceState(null, "", url.toString());
      }
    } catch {
      /* noop */
    }
  }, [toast]);

  return null;
}

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <QueryToastOnce />
        {children}
      </ToastProvider>
    </SessionProvider>
  );
}
