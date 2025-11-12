// src/app/(app)/sales/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";

type Item = {
  id: number;
  code: string;
  name: string;
  qty: number;
  price: number;
  discount: number;
  amount: number;
  cogs: number;
};

type SaleDetail = {
  id: string;
  docNo: string;
  docDate: string | Date;
  date: string | Date;
  status: string | null;
  channel: string | null;
  deletedAt: string | null;
  createdBy: string | null;
  customer: string | null;
  customerInfo: { name: string; phone: string; email: string; address: string };
  items: Item[];
  summary: { subtotal: number; vat: number; total: number; totalCogs: number; gross: number };
};

type ApiRes = { ok: true; sale: SaleDetail } | { ok: false; error: string };

const fmtBaht = (n: number) =>
  (n || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SaleDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const id = decodeURIComponent(params.id);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales/${encodeURIComponent(id)}`, { cache: "no-store" });
      const j = (await res.json()) as ApiRes;
      if (!res.ok || !j.ok) throw new Error((j as any)?.error || "โหลดข้อมูลล้มเหลว");
      setData(j.sale);
    } catch (e: any) {
      alert(e?.message || "โหลดข้อมูลล้มเหลว");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    load();
  }, [id]);

  const restore = async () => {
    if (!data) return;
    if (!confirm(`กู้คืนเอกสาร ${data.docNo} ?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/sales/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idOrDocNo: data.id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.ok === false) throw new Error(j?.message || "กู้คืนไม่สำเร็จ");
      await load();
    } catch (e: any) {
      alert(e?.message || "กู้คืนไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const headerBadge = useMemo(() => {
    const s = (data?.status || "NEW").toUpperCase();
    const map: Record<string, string> = {
      NEW: "bg-amber-100 text-amber-700",
      PENDING: "bg-orange-100 text-orange-700",
      CONFIRMED: "bg-emerald-100 text-emerald-700",
      CANCELLED: "bg-slate-200 text-slate-700",
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs ${map[s] ?? "bg-slate-100"}`}>{s}</span>;
  }, [data?.status]);

  if (loading || !data) return <div className="p-6 text-slate-500">กำลังโหลด…</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-lg border px-3 py-1.5 hover:bg-slate-50"
        >
          กลับ
        </button>

        <div className="text-xl font-semibold">
          {data.docNo}
          <span className="ml-3">{headerBadge}</span>
          {data.deletedAt && (
            <span className="ml-3 px-2 py-0.5 rounded-full text-xs bg-rose-100 text-rose-700">
              ถูกลบแล้ว
            </span>
          )}
        </div>

        <div className="flex-1" />

        {/* ปุ่มกู้คืน (เฉพาะเมื่อถูกลบ) */}
        {data.deletedAt && (
          <button
            onClick={restore}
            disabled={busy}
            className="rounded-xl bg-emerald-600 text-white px-4 py-2 disabled:opacity-60"
          >
            กู้คืน
          </button>
        )}
      </div>

      {/* Info blocks */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-slate-500">วันที่เอกสาร</div>
          <div className="mt-1">{new Date(data.docDate).toLocaleDateString("th-TH")}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-slate-500">ช่องทางการขาย</div>
          <div className="mt-1">{data.channel || "-"}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-slate-500">ลูกค้า</div>
          <div className="mt-1">
            {data.customerInfo.name || data.customer || "-"}
            {data.customerInfo.phone ? ` • ${data.customerInfo.phone}` : ""}
            {data.customerInfo.email ? ` • ${data.customerInfo.email}` : ""}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-2xl border bg-white overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="py-3 px-4 w-16">#</th>
              <th className="py-3 px-4 w-40">รหัส</th>
              <th className="py-3 px-4">สินค้า</th>
              <th className="py-3 px-4 w-24 text-right">จำนวน</th>
              <th className="py-3 px-4 w-28 text-right">ราคา/หน่วย</th>
              <th className="py-3 px-4 w-24 text-right">ส่วนลด</th>
              <th className="py-3 px-4 w-32 text-right">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((it, idx) => (
              <tr key={it.id} className="border-t">
                <td className="py-2 px-4">{idx + 1}</td>
                <td className="py-2 px-4">{it.code}</td>
                <td className="py-2 px-4">{it.name}</td>
                <td className="py-2 px-4 text-right">{it.qty}</td>
                <td className="py-2 px-4 text-right">฿{fmtBaht(it.price)}</td>
                <td className="py-2 px-4 text-right">฿{fmtBaht(it.discount)}</td>
                <td className="py-2 px-4 text-right">฿{fmtBaht(it.amount)}</td>
              </tr>
            ))}
            <tr className="border-t">
              <td colSpan={5} />
              <td className="py-2 px-4 text-right text-slate-500">ยอดก่อนภาษี</td>
              <td className="py-2 px-4 text-right">฿{fmtBaht(data.summary.subtotal)}</td>
            </tr>
            <tr>
              <td colSpan={5} />
              <td className="py-2 px-4 text-right text-slate-500">ภาษีมูลค่าเพิ่ม</td>
              <td className="py-2 px-4 text-right">฿{fmtBaht(data.summary.vat)}</td>
            </tr>
            <tr>
              <td colSpan={5} />
              <td className="py-2 px-4 text-right font-medium">รวมทั้งสิ้น</td>
              <td className="py-2 px-4 text-right font-medium">฿{fmtBaht(data.summary.total)}</td>
            </tr>
            <tr>
              <td colSpan={5} />
              <td className="py-2 px-4 text-right text-slate-500">ต้นทุนรวม (COGS)</td>
              <td className="py-2 px-4 text-right">฿{fmtBaht(data.summary.totalCogs)}</td>
            </tr>
            <tr>
              <td colSpan={5} />
              <td className="py-2 px-4 text-right text-slate-500">กำไรขั้นต้น</td>
              <td className="py-2 px-4 text-right">฿{fmtBaht(data.summary.gross)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
