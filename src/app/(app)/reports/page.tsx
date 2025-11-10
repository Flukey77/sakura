// src/app/(app)/reports/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useRouter, useSearchParams } from "next/navigation";

// กัน static export/ISR สำหรับเส้นทางนี้
export const dynamic = "force-dynamic";

type Period = "today" | "7d" | "month" | "year";

type Sale = {
  id: string;
  date: string | Date;
  docNo: string;
  customer?: string | null;
  channel?: string | null;
  total: number;
};

type ApiRes = {
  ok: boolean;
  summary?: { total: number; gross: number; cogs: number };
  sales?: Sale[];
  message?: string;
};

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then(async (r) => {
    const j = (await r.json()) as ApiRes;
    if (!r.ok) throw new Error(j?.message || "โหลดข้อมูลล้มเหลว");
    return j;
  });

const fmt = (n: number) =>
  (n || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 });

// ---------- แยกเป็น Inner + Suspense ครอบ ----------
function ReportsInner() {
  // sync กับ URL ?range=...
  const sp = useSearchParams();
  const router = useRouter();
  const urlPeriod = (sp.get("range") as Period) || "7d";
  const [period, setPeriod] = useState<Period>(urlPeriod);

  useEffect(() => {
    if (period !== urlPeriod) setPeriod(urlPeriod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlPeriod]);

  const changePeriod = (v: Period) => {
    setPeriod(v);
    const params = new URLSearchParams(sp.toString());
    params.set("range", v);
    router.replace(`/reports?${params.toString()}`, { scroll: false });
  };

  // คำนวณช่วงวัน
  const { from, to } = useMemo(() => {
    const now = new Date();
    const toStr = now.toISOString().slice(0, 10);
    const d = new Date(now);

    if (period === "today") return { from: toStr, to: toStr };
    if (period === "month") {
      d.setDate(1);
      return { from: d.toISOString().slice(0, 10), to: toStr };
    }
    if (period === "year") {
      d.setMonth(0, 1);
      return { from: d.toISOString().slice(0, 10), to: toStr };
    }
    d.setDate(now.getDate() - 6);
    return { from: d.toISOString().slice(0, 10), to: toStr };
  }, [period]);

  // ดึงข้อมูล
  const { data, error, isLoading, mutate } = useSWR<ApiRes>(
    `/api/sales?status=ALL&from=${from}&to=${to}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const sales = data?.sales ?? [];

  // KPIs
  const { total, gross, cogs, fbTotal, ttTotal } = useMemo(() => {
    const t = Number(data?.summary?.total || 0);
    const g = Number(data?.summary?.gross || 0);
    const c = Number(data?.summary?.cogs || 0);
    let fb = 0;
    let tt = 0;
    for (const s of sales) {
      const ch = (s.channel || "").toLowerCase();
      const val = Number(s.total || 0);
      if (ch.includes("facebook")) fb += val;
      if (ch.includes("tiktok") || ch.includes("tik tok")) tt += val;
    }
    return { total: t, gross: g, cogs: c, fbTotal: fb, ttTotal: tt };
  }, [data?.summary, sales]);

  // Chart
  const chartData = useMemo(() => {
    const bucket = new Map<string, number>();
    for (const s of sales) {
      const d = new Date(s.date).toISOString().slice(0, 10);
      bucket.set(d, (bucket.get(d) ?? 0) + Number(s.total ?? 0));
    }
    return [...bucket.keys()]
      .sort()
      .map((k) => ({ label: k, total: bucket.get(k) ?? 0 }));
  }, [sales]);

  return (
    <div className="space-y-6">
      {/* ตัวกรองช่วงเวลา + ปุ่มรีเฟรช */}
      <div className="flex items-center gap-3 justify-end">
        <select
          className="rounded-xl border px-3 py-2 bg-white w-[180px]"
          value={period}
          onChange={(e) => changePeriod(e.target.value as Period)}
          aria-label="ช่วงเวลา"
        >
          <option value="today">วันนี้</option>
          <option value="7d">7 วันล่าสุด</option>
          <option value="month">เดือนนี้</option>
          <option value="year">ปีนี้</option>
        </select>
        <button
          onClick={() => mutate()}
          className="rounded-xl border px-4 py-2 bg-white hover:bg-slate-50 disabled:opacity-60"
          disabled={isLoading}
        >
          {isLoading ? "กำลังโหลด…" : "รีเฟรชข้อมูล"}
        </button>
      </div>

      {/* KPI row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard title="ยอดขายรวม" value={`${fmt(total)} ฿`} />
        <KpiCard title="กำไรขั้นต้น" value={`${fmt(gross)} ฿`} />
        <KpiCard title="ต้นทุนขาย (COGS)" value={`${fmt(cogs)} ฿`} />
        <KpiCard title="ยอดขาย Facebook" value={`${fmt(fbTotal)} ฿`} />
        <KpiCard title="ยอดขาย TikTok" value={`${fmt(ttTotal)} ฿`} />
      </section>

      {/* ตาราง + กราฟ */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold mb-3">รายการล่าสุด</h3>
              <button onClick={() => mutate()} className="btn btn-light btn-sm">
                โหลดซ้ำ
              </button>
            </div>

            {error && (
              <div className="text-red-600">
                {error.message || "โหลดข้อมูลล้มเหลว"}
                <button onClick={() => mutate()} className="btn btn-secondary ml-3">
                  ลองอีกครั้ง
                </button>
              </div>
            )}

            {isLoading && <div className="text-slate-400">กำลังโหลด…</div>}

            {!isLoading && !error && sales.length === 0 ? (
              <div className="py-8 text-slate-500">
                ไม่มีข้อมูลในช่วงเวลานี้
                <button onClick={() => mutate()} className="btn btn-secondary ml-3">
                  รีเฟรช
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-2 pr-4">วันที่</th>
                      <th className="py-2 pr-4">เลขเอกสาร</th>
                      <th className="py-2 pr-4">ลูกค้า</th>
                      <th className="py-2 pr-4">ช่องทาง</th>
                      <th className="py-2 pr-0 text-right">ยอดเงิน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.slice(0, 10).map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="py-2 pr-4">
                          {new Date(r.date).toLocaleDateString("th-TH")}
                        </td>
                        <td className="py-2 pr-4 text-blue-600">{r.docNo}</td>
                        <td className="py-2 pr-4">{r.customer ?? "-"}</td>
                        <td className="py-2 pr-4">{r.channel ?? "-"}</td>
                        <td className="py-2 pr-0 text-right">
                          {fmt(Number(r.total || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="font-semibold mb-3">ยอดขายตามวัน</h3>
            {!chartData.length ? (
              <div className="py-8 text-slate-500">
                ไม่มีข้อมูลกราฟ
                <button onClick={() => mutate()} className="btn btn-secondary ml-3">
                  รีเฟรช
                </button>
              </div>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ReportsPage() {
  // ห่อ Suspense เพื่อให้ useSearchParams ใช้งานได้ตอน build
  return (
    <Suspense fallback={<div className="text-slate-400">กำลังโหลดรายงาน…</div>}>
      <ReportsInner />
    </Suspense>
  );
}

/* ------------ Small components ------------ */
function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="card">
      <div className="card-body flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl grid place-items-center ring-1 ring-slate-200 bg-white">
          <span aria-hidden>📊</span>
        </div>
        <div>
          <div className="text-slate-500 text-sm">{title}</div>
          <div className="text-2xl font-semibold">{value}</div>
        </div>
      </div>
    </div>
  );
}
