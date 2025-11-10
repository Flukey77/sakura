"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import LogoutButton from "./LogoutButton";
import { useMemo, useTransition } from "react";

const PERIODS = [
  { key: "today", label: "วันนี้" },
  { key: "7d", label: "7 วันล่าสุด" },
  { key: "month", label: "เดือนนี้" },
  { key: "year", label: "ปีนี้" },
] as const;

export default function HeaderActions() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // แสดงตัวเลือกช่วงเวลาเฉพาะหน้า /reports
  const showPeriod = useMemo(() => pathname?.startsWith("/reports"), [pathname]);

  const current = (sp.get("period") || "7d") as "today" | "7d" | "month" | "year";

  function changePeriod(p: string) {
    const next = new URLSearchParams(sp.toString());
    next.set("period", p);
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {showPeriod && (
        <select
          className="rounded-xl border px-3 py-2 bg-white w-[180px]"
          value={current}
          onChange={(e) => changePeriod(e.target.value)}
          disabled={pending}
          aria-label="ช่วงเวลา"
        >
          {PERIODS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      )}
      <LogoutButton />
    </div>
  );
}
