"use client";
import { useEffect, useState } from "react";
import { CalendarDays, Wallet, ClipboardList } from "lucide-react";

type Summary = {
  todayAmount: number;
  monthAmount: number;
  yearAmount: number;
  latestSales: { date: string; ref: string; amount: number; status: string }[];
  todayLabel: string;
};
const k = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 2 });

export default function StatCards() {
  const [sum, setSum] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/sales/summary", { cache: "no-store" });
        const data = (await res.json()) as Summary;
        if (mounted) setSum(data);
      } catch {
        if (mounted)
          setSum({ todayAmount: 0, monthAmount: 0, yearAmount: 0, latestSales: [], todayLabel: "" });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const box =
    "flex items-center gap-3 md:gap-4 rounded-2xl border bg-white p-3 md:p-4 shadow-sm ring-1 ring-black/5";
  const iconWrap =
    "shrink-0 grid place-items-center rounded-xl w-10 h-10 md:w-11 md:h-11";

  return (
    <div className="grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-3">
      <div className={box}>
        <div className={`${iconWrap} bg-indigo-50 text-indigo-600`}>
          <CalendarDays className="size-5 md:size-6" />
        </div>
        <div className="min-w-0">
          <p className="text-xs md:text-sm text-slate-500">ยอดขายวันนี้ (บาท)</p>
          <p className="truncate text-lg md:text-2xl font-semibold tracking-tight">
            {loading ? "…" : k(sum?.todayAmount ?? 0)}
          </p>
        </div>
      </div>

      <div className={box}>
        <div className={`${iconWrap} bg-amber-50 text-amber-600`}>
          <Wallet className="size-5 md:size-6" />
        </div>
        <div className="min-w-0">
          <p className="text-xs md:text-sm text-slate-500">ยอดขายเดือนนี้ (บาท)</p>
          <p className="truncate text-lg md:text-2xl font-semibold tracking-tight">
            {loading ? "…" : k(sum?.monthAmount ?? 0)}
          </p>
        </div>
      </div>

      <div className={box}>
        <div className={`${iconWrap} bg-violet-50 text-violet-600`}>
          <ClipboardList className="size-5 md:size-6" />
        </div>
        <div className="min-w-0">
          <p className="text-xs md:text-sm text-slate-500">ยอดขายรวมทั้งปี (บาท)</p>
          <p className="truncate text-lg md:text-2xl font-semibold tracking-tight">
            {loading ? "…" : k(sum?.yearAmount ?? 0)}
          </p>
        </div>
      </div>
    </div>
  );
}

