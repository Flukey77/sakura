// src/app/(app)/products/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  id: number;
  code: string;
  name: string;
  cost: string;
  price: string;
  stock: number;
  safetyStock?: number | null;
  createdAt: string;
};

type ApiRes = {
  ok: boolean;
  items: Product[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
};

export default function ProductsPage() {
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // search + pagination
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // create form
  const [form, setForm] = useState({ code: "", name: "", cost: "", price: "", stock: 0 });
  const [creating, setCreating] = useState(false);

  // row actions
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [savingSafetyId, setSavingSafetyId] = useState<number | null>(null);

  async function load(p = page) {
    setLoading(true);
    try {
      const url = `/api/products?q=${encodeURIComponent(q)}&page=${p}&pageSize=${pageSize}`;
      const res = await fetch(url, { cache: "no-store" });
      const j: ApiRes = await res.json();
      setRows(j.items ?? []);
      setPages(j.pages ?? 1);
      setTotal(j.total ?? 0);
      setPage(j.page ?? p);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
  }, []); // first load

  const list = useMemo(() => rows, [rows]);

  async function addProduct() {
    setCreating(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(j?.error || j?.message || "create failed");
      setForm({ code: "", name: "", cost: "", price: "", stock: 0 });
      await load(1);
      alert("เพิ่มสินค้าเรียบร้อย");
    } catch (e: any) {
      alert(e?.message ?? "error");
    } finally {
      setCreating(false);
    }
  }

  async function deleteProduct(id: number, displayName: string) {
    if (!confirm(`ต้องการลบสินค้า "${displayName}" หรือไม่?`)) return;
    const key = String(id);
    setBusyKey(key);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        alert(j?.error || j?.message || "ลบไม่สำเร็จ");
        return;
      }
      await load(page);
    } finally {
      setBusyKey(null);
    }
  }

  // บันทึก Safety จากค่าปัจจุบันใน input โดยตรง
  async function saveSafetyValue(id: number, value: number) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0) {
      alert("Safety Stock ต้องเป็นจำนวนเต็มไม่ติดลบ");
      return;
    }
    setSavingSafetyId(id);
    try {
      const res = await fetch(`/api/products/${id}/safety`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ safetyStock: n }),
      });
      const j = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        alert(j?.error || "บันทึก Safety ไม่สำเร็จ");
      } else {
        await load(page);
      }
    } finally {
      setSavingSafetyId(null);
    }
  }

  // เผื่อกดจากปุ่ม “บันทึก” (หลัง onChange แล้ว)
  async function saveSafety(p: Product) {
    return saveSafetyValue(p.id, Number(p.safetyStock ?? 0));
  }

  function updateRow<K extends keyof Product>(id: number, key: K, val: Product[K]) {
    setRows((rows) => rows.map((r) => (r.id === id ? { ...r, [key]: val } : r)));
  }

  // ตัวช่วยทำเลขหน้า “… 3 4 [5] 6 7 …”
  function pageNumbers(curr: number, totalPages: number, span = 2) {
    const start = Math.max(1, curr - span);
    const end = Math.min(totalPages, curr + span);
    const nums: (number | "…")[] = [];
    if (start > 1) {
      nums.push(1);
      if (start > 2) nums.push("…");
    }
    for (let i = start; i <= end; i++) nums.push(i);
    if (end < totalPages) {
      if (end < totalPages - 1) nums.push("…");
      nums.push(totalPages);
    }
    return nums;
  }

  return (
    <div className="space-y-6">
      {/* หัว + ค้นหา */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">คลังสินค้า/สินค้า</h1>
        <div className="flex gap-2">
          <input
            className="input w-[260px]"
            placeholder="ค้นหา รหัส/ชื่อสินค้า"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(1)}
          />
          <button className="btn" onClick={() => load(1)}>
            ค้นหา
          </button>
        </div>
      </div>

      {/* ฟอร์มเพิ่มสินค้า */}
      <div className="card">
        <div className="card-body grid grid-cols-1 md:grid-cols-6 gap-3">
          <input
            className="input"
            placeholder="รหัสสินค้า"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <input
            className="input"
            placeholder="ชื่อสินค้า"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="input"
            placeholder="ราคาทุน"
            value={form.cost}
            onChange={(e) => setForm({ ...form, cost: e.target.value })}
          />
          <input
            className="input"
            placeholder="ราคาขาย"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
          <input
            className="input"
            placeholder="สต็อก"
            type="number"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
          />
          <button className="btn btn-primary" disabled={creating} onClick={addProduct}>
            {creating ? "กำลังบันทึก..." : "เพิ่ม"}
          </button>
        </div>
      </div>

      {/* ตารางสินค้า */}
      <div className="card">
        <div className="card-body overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-3 pr-3">รหัส</th>
                <th className="py-3 pr-3">ชื่อ</th>
                <th className="py-3 pr-3">ทุน</th>
                <th className="py-3 pr-3">ขาย</th>
                <th className="py-3 pr-3">สต็อก</th>
                <th className="py-3 pr-3">Safety</th>
                <th className="py-3 w-40 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="py-6" colSpan={7}>
                    Loading…
                  </td>
                </tr>
              ) : !list.length ? (
                <tr>
                  <td className="py-6 text-center text-slate-400" colSpan={7}>
                    ไม่พบข้อมูล
                  </td>
                </tr>
              ) : (
                list.map((p) => {
                  const key = String(p.id);
                  return (
                    <tr key={p.id} className="border-t">
                      <td className="py-2 pr-3">{p.code}</td>
                      <td className="py-2 pr-3">{p.name}</td>
                      <td className="py-2 pr-3">{p.cost}</td>
                      <td className="py-2 pr-3">{p.price}</td>
                      <td className="py-2 pr-3">{p.stock}</td>
                      <td className="py-2 pr-3">
                        <input
                          className="input w-24"
                          type="number"
                          value={p.safetyStock ?? 0}
                          onChange={(e) => updateRow(p.id, "safetyStock", Number(e.target.value))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const current = Number((e.currentTarget as HTMLInputElement).value);
                              saveSafetyValue(p.id, current);
                            }
                          }}
                        />
                      </td>
                      <td className="py-2">
                        <div className="flex gap-2 justify-end">
                          <button
                            className="btn"
                            onClick={() => saveSafety(p)}
                            disabled={savingSafetyId === p.id}
                          >
                            {savingSafetyId === p.id ? "กำลังบันทึก..." : "บันทึก"}
                          </button>
                          <button
                            className="btn border-red-200 text-red-600 hover:bg-red-50"
                            disabled={busyKey === key}
                            onClick={() => deleteProduct(p.id, p.name)}
                          >
                            {busyKey === key ? "กำลังลบ..." : "ลบ"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* ตัวแบ่งหน้า */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              className="rounded-xl border px-3 py-1.5 disabled:opacity-50"
              onClick={() => load(Math.max(1, page - 1))}
              disabled={loading || page <= 1}
              aria-label="ก่อนหน้า"
            >
              «
            </button>

            {pageNumbers(page, pages).map((n, i) =>
              n === "…" ? (
                <span key={`dots-${i}`} className="px-2 text-slate-400">
                  …
                </span>
              ) : (
                <button
                  key={n}
                  onClick={() => load(n)}
                  className={`px-3 py-1.5 rounded-xl border ${
                    n === page ? "bg-slate-900 text-white border-slate-900" : "bg-white"
                  }`}
                  disabled={loading}
                >
                  {n}
                </button>
              )
            )}

            <button
              className="rounded-xl border px-3 py-1.5 disabled:opacity-50"
              onClick={() => load(Math.min(pages, page + 1)))}
              disabled={loading || page >= pages}
              aria-label="ถัดไป"
            >
              »
            </button>
          </div>

          <div className="mt-2 text-center text-sm text-slate-500">
            แสดงหน้า {page}/{pages} — รวม {total.toLocaleString()} รายการ
          </div>
        </div>
      </div>
    </div>
  );
}
