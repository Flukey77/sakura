// src/app/(app)/inventory/alerts/page.tsx
"use client";

import { useEffect, useState } from "react";

type Item = {
  id: number;
  code: string;
  name: string;
  stock: number;
  safetyStock: number;
  needToOrder: number;
};

export default function InventoryAlertsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/inventory/alerts", { cache: "no-store" });
        const data = await res.json();
        if (alive && data?.ok) setItems(data.items ?? []);
      } catch {
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">แจ้งเตือนสต๊อก & รีออเดอร์</h1>

      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <div className="text-slate-600">
              สินค้าที่ต่ำกว่า Safety Stock
            </div>
            <button
              className="btn btn-primary"
              disabled={items.length === 0}
              onClick={() => alert("(เดโม่) สร้างใบสั่งซื้อจากรายการที่เลือก")}
            >
              สร้างใบสั่งซื้อซัพพลายเออร์
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-4">รหัส</th>
                  <th className="py-2 pr-4">สินค้า</th>
                  <th className="py-2 pr-4">คงเหลือ</th>
                  <th className="py-2 pr-4">Safety</th>
                  <th className="py-2 pr-0 text-right">แนะนำสั่งเพิ่ม</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      กำลังโหลด…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      ไม่พบรายการที่ต่ำกว่า Safety Stock
                    </td>
                  </tr>
                ) : (
                  items.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="py-2 pr-4">{p.code}</td>
                      <td className="py-2 pr-4">{p.name}</td>
                      <td className="py-2 pr-4">{p.stock}</td>
                      <td className="py-2 pr-4">{p.safetyStock}</td>
                      <td className="py-2 pr-0 text-right font-medium">
                        {p.needToOrder.toLocaleString("th-TH")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

