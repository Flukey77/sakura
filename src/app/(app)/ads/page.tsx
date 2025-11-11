"use client";

import { Suspense, useMemo, useState } from "react";
import useSWR from "swr";
import {
  Facebook as FacebookIcon,
  Clapperboard as TikTokIcon,
  TrendingUp,
  Coins,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

type Period = "today" | "7d" | "month" | "year";

type AdsSummaryRes = {
  ok: boolean;
  totalCost: number;
  byChannel: Record<string, number>; // { FACEBOOK: number, TIKTOK: number }
  message?: string;
};

type SalesRes = {
  ok: boolean;
  summary?: { total: number; gross: number; cogs: number };
  sales?: { channel?: string | null; total: number }[];
};

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then(async (r) => {
    const j = await r.json();
    if (!r.ok) throw new Error(j?.message || "โหลดข้อมูลล้มเหลว");
    return j as any;
  });

const fmt = (n: number) =>
  (n || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 });

function AdsInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const urlPeriod = (sp.get("range") as Period) || "7d";
  const [period, setPeriod] = useState<Period>(urlPeriod);

  const changePeriod = (v: Period) => {
    setPeriod(v);
    const params = new URLSearchParams(sp.toString());
    params.set("range", v);
    router.replace(`/ads?${params.toString()}`, { scroll: false });
  };

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

  // ดึงค่าโฆษณา
  const { data: ads, isLoading: adsLoading, mutate: refAds } = useSWR<AdsSummaryRes>(
    `/api/ads/summary?from=${from}&to=${to}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // ดึงยอดขายเพื่อคำนวณ ROAS ต่อช่องทาง
  const { data: sales, isLoading: salesLoading, mutate: refSales } = useSWR<SalesRes>(
    `/api/sales?status=ALL&from=${from}&to=${to}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { fbRevenue, ttRevenue, fbAd, ttAd, fbROAS, ttROAS } = useMemo(() => {
    let fbRev = 0,
      ttRev = 0;
    for (const s of sales?.sales ?? []) {
      const ch = (s.channel || "").toLowerCase();
      const val = Number(s.total || 0);
      if (ch.includes("facebook")) fbRev += val;
      if (ch.includes("tiktok") || ch.includes("tik tok")) ttRev += val;
    }
    const fb = Number(ads?.byChannel?.FACEBOOK || 0);
    const tt = Number(ads?.byChannel?.TIKTOK || 0);
    return {
      fbRevenue: fbRev,
      ttRevenue: ttRev,
      fbAd: fb,
      ttAd: tt,
      fbROAS: fb > 0 ? fbRev / fb : 0,
      ttROAS: tt > 0 ? ttRev / tt : 0,
    };
  }, [ads?.byChannel, sales?.sales]);

  const loading = adsLoading || salesLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">ภาพรวมโฆษณา</h1>
        <div className="flex items-center gap-3">
          <select
            className="rounded-xl border px-3 py-2 bg-white w-[200px]"
            value={period}
            onChange={(e) => changePeriod(e.target.value as Period)}
          >
            <option value="today">วันนี้</option>
            <option value="7d">7 วันล่าสุด</option>
            <option value="month">เดือนนี้</option>
            <option value="year">ปีนี้</option>
          </select>
          <button
            className="rounded-xl border px-4 py-2 bg-white hover:bg-slate-50 disabled:opacity-60"
            onClick={() => {
              refAds();
              refSales();
            }}
            disabled={loading}
          >
            {loading ? "กำลังโหลด…" : "รีเฟรชข้อมูล"}
          </button>
        </div>
      </div>

      {/* การ์ด 4 ใบตามที่ขอ */}
      <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
        <KpiCard title="ค่าโฆษณา Facebook" value={`${fmt(fbAd)} ฿`} icon={<FacebookIcon className="h-7 w-7" />} accent="indigo" />
        <KpiCard title="ROAS Facebook" value={`${fbROAS.toFixed(2)}x`} icon={<TrendingUp className="h-7 w-7" />} accent="indigo" />
        <KpiCard title="ค่าโฆษณา TikTok" value={`${fmt(ttAd)} ฿`} icon={<TikTokIcon className="h-7 w-7" />} accent="pink" />
        <KpiCard title="ROAS TikTok" value={`${ttROAS.toFixed(2)}x`} icon={<TrendingUp className="h-7 w-7" />} accent="pink" />
      </section>

      {/* สรุปรวมเล็กน้อย */}
      <div className="card">
        <div className="card-body grid gap-3 sm:grid-cols-3">
          <Mini title="ยอดขาย Facebook" value={`${fmt(fbRevenue)} ฿`} icon={<FacebookIcon className="h-5 w-5" />} />
          <Mini title="ยอดขาย TikTok" value={`${fmt(ttRevenue)} ฿`} icon={<TikTokIcon className="h-5 w-5" />} />
          <Mini title="ค่าโฆษณารวม" value={`${fmt(Number(ads?.totalCost || 0))} ฿`} icon={<Coins className="h-5 w-5" />} />
        </div>
      </div>
    </div>
  );
}

export default function AdsPage() {
  return (
    <Suspense fallback={<div className="text-slate-400">กำลังโหลด…</div>}>
      <AdsInner />
    </Suspense>
  );
}

/* ---------- small comps ---------- */
function KpiCard({
  title,
  value,
  icon,
  accent = "blue",
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
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
        <div className={`h-12 w-12 md:h-14 md:w-14 rounded-2xl grid place-items-center ring-1 bg-gradient-to-b ${ring}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-slate-500 text-sm md:text-[15px] leading-tight">{title}</div>
          <div className="mt-1 text-2xl md:text-3xl font-semibold tracking-tight tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function Mini({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl grid place-items-center bg-slate-100 text-slate-600">{icon}</div>
      <div className="min-w-0">
        <div className="text-slate-500 text-sm">{title}</div>
        <div className="text-lg font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
}
