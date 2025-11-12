"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type AlertRow = {
  code: string;
  name: string;
  stock: number;
  safetyStock: number;
  suggest?: number; // ปริมาณแนะนำสั่งเพิ่ม (ถ้ามีใน API)
};

type ApiRes =
  | { ok: true; items: AlertRow[] }
  | { ok: true; data: AlertRow[] } // บาง API อาจส่งชื่อคีย์ต่างกัน
  | { ok: false; message?: string };

const fetcher = async (url: string) => {
  const r = await fetch(url, { cache: "no-store" });
  const j = (await r.json()) as ApiRes | any;
  if (!r.ok) throw new Error(j?.message || "โหลดข้อมูลล้มเหลว");
  // รองรับหลายรูปแบบผลลัพธ์
  const rows: AlertRow[] = (j?.items || j?.data || j || []).map((x: any) => ({
    code: String(x.code ?? x.productCode ?? ""),
    name: String(x.name ?? x.productName ?? ""),
    stock: Number(x.stock ?? x.qty ?? 0),
    safetyStock: Number(x.safetyStock ?? x.safety ?? 0),
    suggest:
      typeof x.suggest === "number"
        ? x.suggest
        : Math.max(0, Number(x.safetyStock ?? x.safety ?? 0) - Number(x.stock ?? 0)),
  }));
  return rows;
};

const PAGE_SIZE = 10;

export default function InventoryAlertsPage() {
  const sp = useSearchParams();
  const router = useRouter();

  // sync page number กับ query string (?page=)
  const pageFromUrl = Math.max(1, Number(sp.get("page") || 1));
  const [page, setPage] = useState<number>(pageFromUrl);

  useEffect(() => {
    if (page !== pageFromUrl) setPage(pageFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageFromUrl]);

  const [rows, setRows] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      // เปลี่ยน URL ด้านล่างให้ตรงกับ API ของคุณ ถ้าใช้เส้นทางอื่น
      const data = await fetcher("/api/inventory/alerts");
      setRows(data);
    } catch (e: any) {
      setErr(e?.message || "โหลดข้อมูลล้มเหลว");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // paginate
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const pageSafe = Math.min(Math.max(1, page), totalPages);

  const paged = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, pageSafe]);

  function goto(p: number) {
    const next = Math.min(Math.max(1, p), totalPages);
    const qs = new URLSearchParams(sp.toString());
    if (next === 1) qs.delete("page");
    else qs.set("page", String(next));
    router.replace(`/inventory/alerts?${qs.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">แจ้งเตือนสต็อก & รีออเดอร์</h1>
        <p className="text-slate-500 mt-1">สินค้าที่ต่ำกว่า Safety Stock</p>
      </header>

      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium text-slate-700">สินค้าที่ต่ำกว่า Safety Stock</div>
            <div className="flex items-center gap-2">
              <button onClick={load} className="btn">รีเฟรช</button>
              <a href="/purchase-orders/new" className="btn btn-primary">
                สร้างใบสั่งซื้อชิพพลายเออร์
              </a>
            </div>
          </div>

          {err && (
            <div className="text-red-600 mb-3">
              {err} <button onClick={load} className="btn btn-secondary ml-2">ลองอีกครั้ง</button>
            </div>
          )}
          {loading ? (
            <div className="text-slate-400">กำลังโหลด…</div>
          ) : totalItems === 0 ? (
            <div className="text-slate-500">ไม่มีรายการที่ต่ำกว่า Safety Stock</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="py-2 pr-3 w-24">รหัส</th>
                      <th className="py-2 pr-3">สินค้า</th>
                      <th className="py-2 pr-3 w-28">คงเหลือ</th>
                      <th className="py-2 pr-3 w-28">Safety</th>
                      <th className="py-2 pr-0 w-32 text-right">แนะนำสั่งเพิ่ม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((r) => (
                      <tr key={r.code} className="border-t">
                        <td className="py-2 pr-3">{r.code}</td>
                        <td className="py-2 pr-3">{r.name}</td>
                        <td className="py-2 pr-3">{r.stock.toLocaleString("th-TH")}</td>
                        <td className="py-2 pr-3">{r.safetyStock.toLocaleString("th-TH")}</td>
                        <td className="py-2 pr-0 text-right">
                          {(r.suggest ?? Math.max(0, r.safetyStock - r.stock)).toLocaleString("th-TH")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={() => goto(pageSafe - 1)}
                  disabled={pageSafe <= 1}
                  className="btn px-3 disabled:opacity-50"
                  aria-label="ก่อนหน้า"
                >
                  «
                </button>

                <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl bg-slate-900 px-3 text-white">
                  {pageSafe}
                </span>

                <button
                  onClick={() => goto(pageSafe + 1)}
                  disabled={pageSafe >= totalPages}
                  className="btn px-3 disabled:opacity-50"
                  aria-label="ถัดไป"
                >
                  »
                </button>
              </div>

              <p className="mt-2 text-center text-sm text-slate-500">
                แสดงหน้า {pageSafe}/{totalPages} — รวม {totalItems.toLocaleString("th-TH")} รายการ
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
