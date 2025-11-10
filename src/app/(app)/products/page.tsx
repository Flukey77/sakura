// src/app/(app)/products/page.tsx
"use client";

import { useEffect, useState } from "react";

type Product = {
  id: number;    // ← ให้ตรงกับ schema (Int)
  code: string;
  name: string;
  cost: string;
  price: string;
  stock: number;
};

export default function ProductsPage() {
  const [list, setList] = useState<Product[]>([]);
  const [form, setForm] = useState({
    code: "",
    name: "",
    cost: "",
    price: "",
    stock: 0,
  });
  const [creating, setCreating] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null); // เก็บ key ที่กำลังลบ

  async function load() {
    const res = await fetch("/api/products", { cache: "no-store" });
    const data = await res.json().catch(() => ([] as Product[]));
    const items: Product[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.products)
      ? data.products
      : [];
    setList(items);
  }
  useEffect(() => { load(); }, []);

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
      await load();
      alert("เพิ่มสินค้าเรียบร้อย");
    } catch (e: any) {
      alert(e?.message ?? "error");
    } finally {
      setCreating(false);
    }
  }

  // key = id (เช่น "1") หรือ code (เช่น "ABC-001") ก็ได้
  async function deleteProduct(key: string, displayName: string) {
    if (!confirm(`ต้องการลบสินค้า "${displayName}" หรือไม่?`)) return;
    setBusyKey(key);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(key)}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        alert(j?.error || j?.message || "ลบไม่สำเร็จ");
        return;
      }
      alert("ลบสำเร็จ");
      await load();
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* ฟอร์มเพิ่มสินค้า */}
      <div className="card">
        <div className="card-body grid grid-cols-1 md:grid-cols-5 gap-3">
          <input className="input" placeholder="รหัสสินค้า"
            value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}/>
          <input className="input" placeholder="ชื่อสินค้า"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/>
          <input className="input" placeholder="ราคาทุน"
            value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })}/>
          <input className="input" placeholder="ราคาขาย"
            value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}/>
          <div className="flex gap-2">
            <input className="input" placeholder="สต็อก" type="number"
              value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}/>
            <button className="btn btn-primary" disabled={creating} onClick={addProduct}>
              {creating ? "กำลังบันทึก..." : "เพิ่ม"}
            </button>
          </div>
        </div>
      </div>

      {/* ตารางสินค้า */}
      <div className="card">
        <div className="card-body">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500">
                <th className="py-2 pr-3">รหัส</th>
                <th className="py-2 pr-3">ชื่อ</th>
                <th className="py-2 pr-3">ทุน</th>
                <th className="py-2 pr-3">ขาย</th>
                <th className="py-2 pr-3">สต็อก</th>
                <th className="py-2 w-28 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const key = String(p.id); // ← จะเปลี่ยนเป็น p.code ก็ได้
                return (
                  <tr key={p.id} className="border-t">
                    <td className="py-2 pr-3">{p.code}</td>
                    <td className="py-2 pr-3">{p.name}</td>
                    <td className="py-2 pr-3">{p.cost}</td>
                    <td className="py-2 pr-3">{p.price}</td>
                    <td className="py-2 pr-3">{p.stock}</td>
                    <td className="py-2 text-right">
                      <button
                        className="btn border-red-200 text-red-600 hover:bg-red-50"
                        disabled={busyKey === key}
                        onClick={() => deleteProduct(key, p.name)}
                      >
                        {busyKey === key ? "กำลังลบ..." : "ลบ"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!list.length && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    ยังไม่มีสินค้า
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

