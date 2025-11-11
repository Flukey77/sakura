// src/app/(app)/sales/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

type Sale = {
  id: string;
  docNo: string;
  date: string | Date;
  docDate?: string | Date;
  customer: string | null;
  channel: string | null;
  total: number;
  status: "NEW" | "PENDING" | "CONFIRMED" | "CANCELLED" | string;
  user?: { id: string; username: string; name: string | null };
};

type ApiRes = {
  ok: boolean;
  summary: { count: number; total: number; cogs: number; gross: number };
  counters: Record<"ALL" | "NEW" | "PENDING" | "CONFIRMED" | "CANCELLED", number>;
  sales: (Sale & { items?: any[] })[];
  pagination?: { page: number; pageSize: number; totalCount: number; totalPages: number };
  message?: string;
};

const TH_STATUS: Record<string, { label: string; cls: string }> = {
  NEW: { label: "รอโอน", cls: "bg-amber-100 text-amber-700" },
  PENDING: { label: "รอชำระ", cls: "bg-orange-100 text-orange-700" },
  CONFIRMED: { label: "ยืนยันแล้ว", cls: "bg-emerald-100 text-emerald-700" },
  CANCELLED: { label: "ยกเลิก", cls: "bg-slate-200 text-slate-700" },
};

function Pill({ status }: { status: string }) {
  const m = TH_STATUS[status] ?? { label: status, cls: "bg-slate-100 text-slate-700" };
  return <span className={`px-2 py-0.5 rounded-full text-xs ${m.cls}`}>{m.label}</span>;
}

const fmtBaht = (n: number) =>
  (n || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TABS = [
  { key: "ALL",       label: "ทั้งหมด" },
  { key: "NEW",       label: "รอโอน" },
  { key: "PENDING",   label: "รอชำระ" },
  { key: "CONFIRMED", label: "ยืนยันแล้ว" },
  { key: "CANCELLED", label: "ยกเลิก" },
] as const;

function PageBtn({
  active,
  disabled,
  children,
  onClick,
}: {
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      className={`min-w-9 px-3 py-1.5 rounded-xl border ${
        active ? "bg-slate-900 text-white border-slate-900" : "bg-white"
      } disabled:opacity-50`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function SalesContent() {
  const router = useRouter();
  const sp = useSearchParams();

  const tab = (sp.get("status") || "ALL").toUpperCase();
  const page = Math.max(1, Number(sp.get("page") || 1));
  // default 10 ต่อหน้า
  const pageSize = Math.min(Math.max(5, Number(sp.get("pageSize") || 10)), 100);
  const q = (sp.get("q") || "").trim();

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [data, setData] = useState<ApiRes | null>(null);
  const [search, setSearch] = useState(q);

  const load = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const qs = new URLSearchParams();
      qs.set("status", tab);
      qs.set("page", String(page));
      qs.set("pageSize", String(pageSize));
      if (q) qs.set("q", q);
      const url = `/api/sales?${qs.toString()}`;
      const res = await fetch(url, { cache: "no-store" });
      const j = (await res.json()) as ApiRes;
      if (!res.ok || j.ok === false) throw new Error(j?.message || "โหลดข้อมูลล้มเหลว");
      setData(j);
    } catch (e: any) {
      setErrorMsg(e?.message || "โหลดข้อมูลล้มเหลว");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab, page, pageSize, q]);

  const goto = (p: number) => {
    const params = new URLSearchParams(sp.toString());
    params.set("status", tab);
    params.set("page", String(Math.max(1, p)));
    params.set("pageSize", String(pageSize));
    if (q) params.set("q", q); else params.delete("q");
    router.push(`/sales?${params.toString()}`);
  };

  const applySearch = () => {
    const params = new URLSearchParams(sp.toString());
    params.set("status", tab);
    params.set("page", "1");
    params.set("pageSize", String(pageSize));
    if (search.trim()) params.set("q", search.trim()); else params.delete("q");
    router.push(`/sales?${params.toString()}`);
  };

  const clearSearch = () => {
    setSearch("");
    const params = new URLSearchParams(sp.toString());
    params.set("status", tab);
    params.set("page", "1");
    params.set("pageSize", String(pageSize));
    params.delete("q");
    router.push(`/sales?${params.toString()}`);
  };

  const changeStatus = async (id: string, status: string) => {
    if (!confirm(`ยืนยันเปลี่ยนสถานะเป็น "${TH_STATUS[status]?.label || status}" ?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/sales/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || "อัปเดตไม่สำเร็จ");
      await load();
    } catch (e: any) {
      alert(e?.message || "อัปเดตไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const sales = useMemo(() => data?.sales ?? [], [data]);
  const totalPages = data?.pagination?.totalPages ?? 1;
  const curPage = data?.pagination?.page ?? page;

  const pageWindow = 2;
  const start = Math.max(1, curPage - pageWindow);
  const end = Math.min(totalPages, curPage + pageWindow);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div className="space-y-6">
      {/* สรุปยอด */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white"><div className="p-5">
          <div className="text-slate-500">จำนวนออเดอร์</div>
          <div className="text-3xl font-semibold mt-1">{data?.summary.count ?? 0}</div>
        </div></div>
        <div className="rounded-2xl border bg-white"><div className="p-5">
          <div className="text-slate-500">มูลค่าทั้งหมด (รายได้)</div>
          <div className="text-3xl font-semibold mt-1">฿{fmtBaht(data?.summary.total ?? 0)}</div>
        </div></div>
        <div className="rounded-2xl border bg-white">
          <div className="p-5 grid grid-cols-2 gap-2">
            <div><div className="text-slate-500">ต้นทุนขาย</div>
              <div className="text-xl font-semibold mt-1">฿{fmtBaht(data?.summary.cogs ?? 0)}</div>
            </div>
            <div><div className="text-slate-500">กำไรขั้นต้น</div>
              <div className="text-xl font-semibold mt-1">฿{fmtBaht(data?.summary.gross ?? 0)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* แถบสถานะ + ค้นหา + ปุ่ม */}
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              const params = new URLSearchParams(sp.toString());
              params.set("status", t.key);
              params.set("page", "1");
              params.set("pageSize", String(pageSize));
              if (q) params.set("q", q); else params.delete("q");
              router.push(`/sales?${params.toString()}`);
            }}
            className={`px-3 py-1.5 rounded-xl border ${
              tab === t.key ? "bg-slate-900 text-white border-slate-900" : "bg-white"
            }`}
            disabled={loading}
          >
            {t.label}
            {typeof data?.counters?.[t.key] === "number" && (
              <span className="ml-2 text-slate-500">{data?.counters?.[t.key]}</span>
            )}
          </button>
        ))}

        <div className="flex-1" />

        {/* กล่องค้นหา */}
        <div className="flex items-center gap-2">
          <input
            className="input w-[260px]"
            placeholder="ค้นหา เลขเอกสาร/ลูกค้า"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
          />
          <button className="btn" onClick={applySearch} disabled={loading}>ค้นหา</button>
          {q && (
            <button className="btn btn-secondary" onClick={clearSearch} disabled={loading}>
              ล้าง
            </button>
          )}
        </div>

        <button onClick={() => router.push("/sales/new")} className="rounded-xl bg-blue-600 text-white px-4 py-2">สร้าง</button>
        <button onClick={load} className="rounded-xl border px-4 py-2 disabled:opacity-60" disabled={loading}>
          {loading ? "กำลังโหลด…" : "รีเฟรช"}
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {errorMsg} <button onClick={load} className="btn btn-secondary ml-3">ลองใหม่</button>
        </div>
      )}

      {/* ตาราง */}
      <div className="rounded-2xl border bg-white overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="py-3 px-4 w-[120px]">วันที่</th>
              <th className="py-3 px-4">เลขเอกสาร</th>
              <th className="py-3 px-4">ลูกค้า</th>
              <th className="py-3 px-4 w-[160px]">ช่องทาง</th>
              <th className="py-3 px-4 w-[160px]">มูลค่า</th>
              <th className="py-3 px-4 w-[130px]">สถานะ</th>
              <th className="py-3 px-4 w-[220px] text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {(!errorMsg && data && data.sales.length === 0) && (
              <tr><td colSpan={7} className="py-10 text-center text-slate-500">
                ไม่มีข้อมูลในช่วงเวลานี้ <button onClick={load} className="btn btn-secondary ml-3">รีเฟรช</button>
              </td></tr>
            )}

            {sales.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="py-2 px-4">{new Date(s.date).toLocaleDateString("th-TH")}</td>
                <td className="py-2 px-4">{s.docNo}</td>
                <td className="py-2 px-4">{s.customer || "-"}</td>
                <td className="py-2 px-4">{s.channel || "-"}</td>
                <td className="py-2 px-4">฿{fmtBaht(Number(s.total || 0))}</td>
                <td className="py-2 px-4"><Pill status={(s.status || "NEW").toUpperCase()} /></td>
                <td className="py-2 px-4">
                  <div className="flex gap-2 justify-end">
                    <button className="rounded-lg border px-3 py-1 hover:bg-slate-50" onClick={() => changeStatus(s.id, "PENDING")} disabled={busy}>ทำเป็นรอชำระ</button>
                    <button className="rounded-lg border px-3 py-1 hover:bg-slate-50" onClick={() => changeStatus(s.id, "CONFIRMED")} disabled={busy}>ทำเป็นยืนยันแล้ว</button>
                    <button className="rounded-lg border px-3 py-1 hover:bg-red-50 text-red-600" onClick={() => changeStatus(s.id, "CANCELLED")} disabled={busy}>ยกเลิก</button>
                  </div>
                </td>
              </tr>
            ))}

            {loading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={`skeleton-${i}`} className="border-t animate-pulse">
                <td className="py-3 px-4"><div className="h-3 w-16 bg-slate-200 rounded" /></td>
                <td className="py-3 px-4"><div className="h-3 w-28 bg-slate-200 rounded" /></td>
                <td className="py-3 px-4"><div className="h-3 w-24 bg-slate-200 rounded" /></td>
                <td className="py-3 px-4"><div className="h-3 w-20 bg-slate-200 rounded" /></td>
                <td className="py-3 px-4"><div className="h-3 w-24 bg-slate-200 rounded" /></td>
                <td className="py-3 px-4"><div className="h-5 w-16 bg-slate-200 rounded-full" /></td>
                <td className="py-3 px-4"><div className="h-8 w-40 bg-slate-200 rounded-lg ml-auto" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* แบ่งหน้า */}
      <div className="flex items-center justify-center gap-2">
        <PageBtn disabled={curPage <= 1} onClick={() => goto(curPage - 1)}>«</PageBtn>
        {start > 1 && (<><PageBtn onClick={() => goto(1)}>1</PageBtn>{start > 2 && <span className="px-1 text-slate-400">…</span>}</>)}
        {pages.map((p) => (<PageBtn key={p} active={p === curPage} onClick={() => goto(p)}>{p}</PageBtn>))}
        {end < totalPages && (<>{end < totalPages - 1 && <span className="px-1 text-slate-400">…</span>}<PageBtn onClick={() => goto(totalPages)}>{totalPages}</PageBtn></>)}
        <PageBtn disabled={curPage >= totalPages} onClick={() => goto(curPage + 1)}>»</PageBtn>
      </div>
    </div>
  );
}

export default function SalesPage() {
  return (
    <Suspense fallback={<div className="text-slate-400">กำลังโหลดรายการขาย…</div>}>
      <SalesContent />
    </Suspense>
  );
}
