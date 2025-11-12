"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";

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
  sales: Sale[];
  totalRows: number;
  page: number;
  pageSize: number;
  message?: string;
};

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then(async (r) => {
    const j = await r.json();
    if (!r.ok) throw new Error(j?.message || "โหลดข้อมูลไม่สำเร็จ");
    return j as SalesRes;
  });

const fmt = (n: number) =>
  (n || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 });

export default function RecentSalesPage() {
  const router = useRouter();
  const sp = useSearchParams();

  // state ผ่าน URL
  const page = Math.max(1, Number(sp.get("page") || 1));
  const pageSize = 10; // ตามคำขอ
  const qDoc = sp.get("doc") || "";
  const qCustomer = sp.get("customer") || "";
  const qChannel = sp.get("channel") || "";

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("status", "ALL");
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    if (qDoc) p.set("doc", qDoc);
    if (qCustomer) p.set("customer", qCustomer);
    if (qChannel) p.set("channel", qChannel);
    return p.toString();
  }, [page, pageSize, qDoc, qCustomer, qChannel]);

  const { data, error, isLoading, mutate } = useSWR<SalesRes>(
    `/api/sales?${qs}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const sales = data?.sales ?? [];
  const totalRows = data?.totalRows ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(sp.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    p.set("page", "1"); // รีเซ็ตหน้าเมื่อกรอง
    router.replace(`/reports/recent?${p.toString()}`, { scroll: false });
  }
  function goPage(pn: number) {
    const p = new URLSearchParams(sp.toString());
    p.set("page", String(Math.min(Math.max(1, pn), totalPages)));
    router.replace(`/reports/recent?${p.toString()}`, { scroll: false });
  }

  useEffect(() => {
    // กันค่าเพี้ยน
    if (page < 1) goPage(1);
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">รายการล่าสุด</h1>
        <button onClick={() => mutate()} className="btn">
          รีเฟรช
        </button>
      </div>

      {/* ฟิลเตอร์ค้นหา */}
      <div className="card">
        <div className="card-body grid gap-3 sm:grid-cols-3">
          <div>
            <div className="text-sm text-slate-600 mb-1">เลขเอกสาร</div>
            <input
              className="input"
              placeholder="เช่น SO-2025..."
              defaultValue={qDoc}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  setParam("doc", (e.target as HTMLInputElement).value.trim());
              }}
              onBlur={(e) => setParam("doc", e.currentTarget.value.trim())}
            />
          </div>
          <div>
            <div className="text-sm text-slate-600 mb-1">ลูกค้า</div>
            <input
              className="input"
              placeholder="ชื่อ/คำค้นลูกค้า"
              defaultValue={qCustomer}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  setParam(
                    "customer",
                    (e.target as HTMLInputElement).value.trim()
                  );
              }}
              onBlur={(e) => setParam("customer", e.currentTarget.value.trim())}
            />
          </div>
          <div>
            <div className="text-sm text-slate-600 mb-1">ช่องทาง</div>
            <input
              className="input"
              placeholder="เช่น TikTok, Facebook, หน้าร้าน"
              defaultValue={qChannel}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  setParam("channel", (e.target as HTMLInputElement).value.trim());
              }}
              onBlur={(e) => setParam("channel", e.currentTarget.value.trim())}
            />
          </div>
        </div>
      </div>

      {/* ตาราง */}
      <div className="card">
        <div className="card-body">
          {error && (
            <div className="text-red-600">
              {(error as any)?.message || "โหลดข้อมูลล้มเหลว"}
            </div>
          )}
          {isLoading ? (
            <div className="text-slate-500">กำลังโหลด…</div>
          ) : sales.length === 0 ? (
            <div className="text-slate-500">ไม่พบข้อมูล</div>
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
                  {sales.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="py-2 pr-4">
                        {new Date(r.date).toLocaleDateString("th-TH")}
                      </td>
                      <td className="py-2 pr-4 text-blue-600">
                        {/* ลิงก์เปิดในหน้าเดิม (ถ้ามีหน้ารายละเอียดรายใบในอนาคตค่อยเปลี่ยนเป็น /sales/[id]) */}
                        {r.docNo}
                      </td>
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

        {/* เพจจิเนชันแบบรูปที่ 2 = 10 รายการ/หน้า */}
        <div className="card-footer">
          <div className="flex items-center justify-center gap-2">
            <button
              className="btn"
              onClick={() => goPage(page - 1)}
              disabled={page <= 1}
              aria-label="ก่อนหน้า"
              title="ก่อนหน้า"
            >
              «
            </button>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white font-medium">
              {page}
            </span>
            <button
              className="btn"
              onClick={() => goPage(page + 1)}
              disabled={page >= totalPages}
              aria-label="ถัดไป"
              title="ถัดไป"
            >
              »
            </button>
          </div>
          <div className="mt-2 text-center text-sm text-slate-500">
            แสดงหน้า {page}/{totalPages} — รวม {totalRows} รายการ
          </div>
        </div>
      </div>
    </div>
  );
}
