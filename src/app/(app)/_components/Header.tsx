"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function RightControlsInner() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const router = useRouter();

  // แสดงดรอปดาวน์หากอยู่หน้าใดๆ ที่มีคำว่า "report" (รองรับ /reports, /report, /admin/reports ฯลฯ)
  const showRange = !!pathname && pathname.toLowerCase().includes("report");
  const range = sp.get("range") || "7d";

  const ranges = useMemo(
    () => [
      { value: "today", label: "วันนี้" },
      { value: "7d",    label: "7 วันล่าสุด" },
      { value: "month", label: "เดือนนี้" },
      { value: "year",  label: "ปีนี้" },
    ],
    []
  );

  const onChangeRange = (value: string) => {
    const params = new URLSearchParams(sp.toString());
    params.set("range", value);
    // ✅ แทนที่จะพาไป /reports ตายตัว ให้คง path ปัจจุบัน
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex items-center gap-3">
      {showRange && (
        <select
          className="rounded-xl border px-3 py-2 bg-white w-[180px]"
          value={range}
          onChange={(e) => onChangeRange(e.target.value)}
          aria-label="ช่วงเวลา"
        >
          {ranges.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      )}

      <Link href="/logout" className="rounded-xl border px-3 py-2 hover:bg-slate-50">
        ออกจากระบบ
      </Link>
    </div>
  );
}

export default function Header() {
  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b bg-white">
      <div className="font-semibold">Sakura</div>
      <Suspense fallback={<div className="text-slate-400">…</div>}>
        <RightControlsInner />
      </Suspense>
    </header>
  );
}
