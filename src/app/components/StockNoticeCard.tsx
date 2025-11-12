"use client";

import Link from "next/link";
import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((r) => r.json());

export default function StockNoticeCard() {
  const { data } = useSWR<{ ok: boolean; count: number }>(
    "/api/inventory/alerts/count",
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true, fallbackData: { ok: true, count: 0 } }
  );

  const count = Number(data?.count ?? 0);
  if (count <= 0) return null;

  return (
    <div className="card p-4 sm:p-5 flex items-start gap-3 border-amber-300/60 bg-amber-50">
      {/* จุดแดงกระพิบ */}
      <span className="dot-urgent mt-1.5"></span>

      <div className="min-w-0">
        <div className="font-medium text-slate-800">
          สินค้าใกล้หมด {count.toLocaleString()} รายการ
        </div>
        <div className="text-sm text-slate-600">
          มีสต๊อกต่ำกว่า Safety Stock — ควรตรวจสอบและสั่งซื้อเพิ่ม
        </div>
      </div>

      <div className="ml-auto shrink-0">
        <Link href="/inventory/alerts" className="btn btn-dark">
          ไปยังการแจ้งเตือน
        </Link>
      </div>
    </div>
  );
}
