"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import {
  ArrowLeft, BadgeCheck, FileText, User,
  Package2, Truck, CalendarDays
} from "lucide-react";

const fetcher = (u: string) => fetch(u, { cache: "no-store" }).then((r) => r.json());
const thb = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" });
const fmtDate = (v?: string) => (v ? new Date(v).toLocaleDateString("th-TH") : "-");

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data } = useSWR<{ ok: boolean; sale?: any; error?: string }>(
    `/api/sales/${encodeURIComponent(id)}`, fetcher
  );

  if (!data) return <div className="text-slate-500">กำลังโหลดรายละเอียด…</div>;
  if (!data.ok || !data.sale) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="btn">← กลับ</button>
        <div className="text-red-600">{data.error || "ไม่พบเอกสาร"}</div>
      </div>
    );
  }

  const s = data.sale;

  const StatusPill = () => {
    const map: Record<string, string> = {
      NEW: "bg-slate-100 text-slate-700",
      PENDING: "bg-amber-100 text-amber-800",
      CONFIRMED: "bg-emerald-100 text-emerald-700",
      CANCELLED: "bg-rose-100 text-rose-700",
    };
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${map[s.status] ?? "bg-slate-100 text-slate-700"}`}>
        <BadgeCheck className="h-3.5 w-3.5" />
        {s.status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => router.back()} className="btn">
          <ArrowLeft className="h-4 w-4" /> กลับ
        </button>
        <div className="ml-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {s.docNo}
            </h1>
            <StatusPill />
          </div>
          <div className="text-sm text-slate-500 mt-0.5">
            ออกโดย: {s.createdBy ?? "-"}
          </div>
        </div>
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 flex items-start gap-3">
          <CalendarDays className="h-5 w-5 text-slate-500 mt-0.5" />
          <div>
            <div className="text-slate-500 text-sm">วันที่เอกสาร</div>
            <div className="font-medium">{fmtDate(s.docDate)}</div>
          </div>
        </div>

        <div className="card p-4 flex items-start gap-3">
          <Truck className="h-5 w-5 text-slate-500 mt-0.5" />
          <div>
            <div className="text-slate-500 text-sm">ช่องทางการขาย</div>
            <div className="font-medium">{s.channel || "-"}</div>
          </div>
        </div>

        <div className="card p-4 flex items-start gap-3">
          <User className="h-5 w-5 text-slate-500 mt-0.5" />
          <div>
            <div className="text-slate-500 text-sm">ลูกค้า</div>
            <div className="font-medium">{s.customerInfo?.name || "-"}</div>
            <div className="text-sm text-slate-500">
              {s.customerInfo?.phone || ""}{s.customerInfo?.email ? ` • ${s.customerInfo.email}` : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Address */}
      {(s.customerInfo?.address || "") && (
        <div className="card p-4">
          <div className="text-slate-500 text-sm mb-1">ที่อยู่ลูกค้า</div>
          <div className="whitespace-pre-wrap">{s.customerInfo.address}</div>
        </div>
      )}

      {/* Items */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-2 mb-3">
            <Package2 className="h-5 w-5 text-slate-600" />
            <h3 className="font-semibold">รายการสินค้า</h3>
          </div>

          <div className="table-wrap">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="th">#</th>
                  <th className="th">รหัส</th>
                  <th className="th">สินค้า</th>
                  <th className="th text-right">จำนวน</th>
                  <th className="th text-right">ราคา/หน่วย</th>
                  <th className="th text-right">ส่วนลด</th>
                  <th className="th text-right">จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                {s.items.map((it: any, idx: number) => (
                  <tr key={it.id} className="border-b">
                    <td className="td">{idx + 1}</td>
                    <td className="td">{it.code}</td>
                    <td className="td">{it.name}</td>
                    <td className="td text-right">{it.qty.toLocaleString()}</td>
                    <td className="td text-right">{thb.format(it.price)}</td>
                    <td className="td text-right">{thb.format(it.discount)}</td>
                    <td className="td text-right font-medium">{thb.format(it.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mt-4 w-full md:w-80 ml-auto">
            <div className="flex justify-between py-1 text-sm">
              <span className="text-slate-500">ยอดก่อนภาษี</span>
              <span>{thb.format(s.summary.subtotal)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-slate-500">ภาษีมูลค่าเพิ่ม</span>
              <span>{thb.format(s.summary.vat)}</span>
            </div>
            <div className="flex justify-between py-2 border-t mt-2 text-base font-semibold">
              <span>รวมทั้งสิ้น</span>
              <span>{thb.format(s.summary.total)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm text-slate-600">
              <span>ต้นทุนรวม (COGS)</span>
              <span>{thb.format(s.summary.totalCogs)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm font-medium">
              <span>กำไรขั้นต้น</span>
              <span>{thb.format(s.summary.gross)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
