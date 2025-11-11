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
import {
  BarChart2,
  PiggyBank,
  PackageSearch,
  Facebook as FacebookIcon,
  Clapperboard as TikTokIcon,
  Coins,
  Calculator,
} from "lucide-react";

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

type SalesRes = {
  ok: boolean;
  summary?: { total: number; gross: number; cogs: number };
  sales?: Sale[];
  message?: string;
};

type AdsSummaryRes = {
  ok: boolean;
  totalCost: number;
  byChannel: Record<string, number>; // { FACEBOOK: number, TIKTOK: number }
  message?: string;
};

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then(async (r) => {
    const j = await r.json();
    if (!r.ok) throw new Error(j?.message || "โหลดข้อมูลล้มเหลว");
    return j as any;
  });

const fmt = (n: number) =>
  (n || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 });

function ReportsInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const urlPeriod = (sp.get("range") as Period) || "7d";
  const [period, setPeriod] = useState<Period>(urlPeriod);

  useEffect(() => {
    if (period !== urlPeriod) setPeriod(urlPeriod);
  }, [urlPeriod, period]);

  const changePeriod = (v: Period) => {
    setPeriod(v);
    const params = new URLSearchParams(sp.toString());
    params.set("range", v);
    router.replace(`/reports?${params.toString()}`, { scroll: false });
  };

  // คำนวณช่วงวันที่
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

  // ดึงข้อมูลยอดขาย
  const {
    data: salesData,
    error: salesErr,
    isLoading: salesLoading,
    mutate: refSales,
  } = useSWR<SalesRes>(
    `/api/sales?status=ALL&from=${from}&to=${to}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // ดึงสรุปค่าโฆษณารวม
  const {
    data: adsData,
    error: adsErr,
    isLoading: adsLoading,
    mutate: refAds,
  } = useSWR<AdsSummaryRes>(
    `/api/ads/summary?from=${from}&to=${to}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const sales = salesData?.sales ?? [];
  const byChannel = adsData?.byChannel ?? {};

  // KPI รวม
  const kpi = useMemo(() => {
    const total = Number(salesData?.summary?.total || 0);
    const gross = Number(salesData?.summary?.gross || 0);
    const cogs = Number(salesData?.summary?.cogs || 0);

    let fbRevenue = 0;
    let ttRevenue = 0;
    for (const s of sales) {
      const ch = (s.channel || "").toLowerCase();
      const val = Number(s.total || 0);
      if (ch.includes("facebook")) fbRevenue += val;
      if (ch.includes("tiktok") || ch.includes("tik tok")) ttRevenue += val;
    }

    const adTotal = Number(adsData?.totalCost || 0);
    const netProfit = gross - adTotal;

    return {
      total,
      gross,
      cogs,
      adTotal,
      netProfit,
      fbRevenue,
      ttRevenue,
    };
  }, [salesData?.summary, sales, adsData?.totalCost]);

  // ข้อมูลกราฟ
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

  const loading = salesLoading || adsLoading;
  const error = salesErr || adsErr;

  return (
    <div className="space-y-6">
      {/* ตัวกรองช่วงเวลา */}
      <div className="flex items-center gap-3 justify-end">
        <select
          className="rounded-xl border px-3 py-2 bg-white w-[200px]"
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
          onClick={() => {
            refSales();
            refAds();
          }}
          className="rounded-xl border px-4 py-2 bg-white hover:bg-slate-50 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "กำลังโหลด…" : "รีเฟรชข้อมูล"}
        </button>
      </div>

      {/* KPI หลัก — โล่งขึ้น และการ์ดจะขยายอัตโนมัติ */}
      <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
        <KpiCard
          title="ยอดขายรวม"
          value={`${fmt(kpi.total)} ฿`}
          icon={<BarChart2 className="h-7 w-7" />}
          accent="blue"
        />
        <KpiCard
          title="กำไรขั้นต้น"
          value={`${fmt(kpi.gross)} ฿`}
          icon={<PiggyBank className="h-7 w-7" />}
          accent="emerald"
        />
        <KpiCard
          title="ต้นทุนขาย (COGS)"
          value={`${fmt(kpi.cogs)} ฿`}
          icon={<PackageSearch className="h-7 w-7" />}
          accent="slate"
        />
        <KpiCard
          title="ยอดขาย Facebook"
          value={`${fmt(kpi.fbRevenue)} ฿`}
          icon={<FacebookIcon className="h-7 w-7" />}
          accent="indigo"
        />
        <KpiCard
          title="ยอดขาย TikTok"
          value={`${fmt(kpi.ttRevenue)} ฿`}
          icon={<TikTokIcon className="h-7 w-7" />}
          accent="pink"
        />
        <KpiCard
          title="ค่าโฆษณารวม"
          value={`${fmt(kpi.adTotal)} ฿`}
          icon={<Coins className="h-7 w-7" />}
          accent="slate"
        />
        <KpiCard
          title="กำไรสุทธิ"
          value={`${fmt(kpi.netProfit)} ฿`}
          icon={<Calculator className="h-7 w-7" />}
          accent="emerald"
        />
      </section>

      {/* ตาราง + กราฟ */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold mb-3">รายการล่าสุด</h3>
              <button
                onClick={() => {
                  refSales();
                  refAds();
                }}
                className="btn btn-light btn-sm"
              >
                โหลดซ้ำ
              </button>
            </div>

            {error && (
              <div className="text-red-600">
                {(error as any).message || "โหลดข้อมูลล้มเหลว"}
                <button
                  onClick={() => {
                    refSales();
                    refAds();
                  }}
                  className="btn btn-secondary ml-3"
                >
                  ลองอีกครั้ง
                </button>
              </div>
            )}

            {loading && <div className="text-slate-400">กำลังโหลด…</div>}

            {!loading && !error && sales.length === 0 ? (
              <div className="py-8 text-slate-500">
                ไม่มีข้อมูลในช่วงเวลานี้
                <button
                  onClick={() => {
                    refSales();
                    refAds();
                  }}
                  className="btn btn-secondary ml-3"
                >
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
                <button
                  onClick={() => {
                    refSales();
                    refAds();
                  }}
                  className="btn btn-secondary ml-3"
                >
                  รีเฟรช
                </button>
              </div>
            ) : (
              <div className="h-[280px]">
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
  return (
    <Suspense fallback={<div className="text-slate-400">กำลังโหลดรายงาน…</div>}>
      <ReportsInner />
    </Suspense>
  );
}

/* ------------ Small components ------------ */
function KpiCard({
  title,
  value,
  icon,
  accent = "blue",
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  /** tailwind สีหลัก: blue | emerald | slate | indigo | pink */
  accent?: "blue" | "emerald" | "slate" | "indigo" | "pink";
}) {
  const ring =
    accent === "emerald"
      ? "from-emerald-100 to-emerald-50 text-emerald-700 ring-emerald-200"
      : accent === "slate"
      ? "from-slate-100 to-white text-slate-700 ring-slate-200"
      : accent === "indigo"
      ? "from-indigo-100 to-indigo-50 text-indigo-700 ring-indigo-200"
      : accent === "pink"
      ? "from-pink-100 to-pink-50 text-pink-700 ring-pink-200"
      : "from-blue-100 to-blue-50 text-blue-700 ring-blue-200";

  return (
    <div className="card min-h-[104px]">
      <div className="card-body flex items-center gap-4 p-5 md:p-6">
        <div
          className={`h-12 w-12 md:h-14 md:w-14 rounded-2xl grid place-items-center ring-1 bg-gradient-to-b ${ring}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-slate-500 text-sm md:text-[15px] leading-tight">
            {title}
          </div>
          <div className="mt-1 text-2xl md:text-3xl font-semibold tracking-tight tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}
