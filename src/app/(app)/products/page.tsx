"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

type Product = {
  id: number;
  code: string;
  name: string;
  cost: number;
  price: number;
  stock: number;
};

export default function ProductsPage() {
  const { data: session } = useSession();
  const isAdmin = useMemo(() => (session?.user as any)?.role === "ADMIN", [session]);

  const [list, setList] = useState<Product[]>([]);
  const [form, setForm] = useState({ code: "", name: "", cost: "", price: "", stock: 0 });
  const [creating, setCreating] = useState(false);
  const [busyKey, setBusyKey] = useState<number | null>(null); // row ที่กำลังอัปเดต/ลบ

  async function load() {
    const res = await fetch("/api/products", { cache: "no-store" });
    const j = await res.json().catch(() => ([] as Product[]));
    const items: Product[] = Array.isArray(j) ? j : (j?.products ?? []);
    setList(items.map(p => ({ ...p, cost: Number(p.cost), price: Number(p.price), stock: Number(p.stock) })));
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

  async function updateField(id: number, patch: Partial<Pick<Product, "cost" | "price" | "stock">>) {
    setBusyKey(id);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const j = await res.json().catch(() => ({} as any));
      if (!res.ok) return alert(j?.error || "อัปเดตไม่สำเร็จ");
      // sync state เร็ว ๆ
      setList(prev => prev.map(p => (p.id === id ? { ...p, ...patch } as Product : p)));
    } finally {
      setBusyKey(null);
    }
  }

  async function deleteProduct(id: number, displayName: string) {
    if (!confirm(`ต้องการลบสินค้า "${displayName}" หรือไม่?`)) return;
    setBusyKey(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        alert(j?.error || j?.message || "ลบไม่สำเร็จ");
        return;
      }
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
              {list.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="py-2 pr-3">{p.code}</td>
                  <td className="py-2 pr-3">{p.name}</td>

                  {/* ทุน */}
                  <td className="py-2 pr-3">
                    {isAdmin ? (
                      <input
                        className="input w-28"
                        type="number"
                        step="0.01"
                        disabled={busyKey === p.id}
                        defaultValue={p.cost}
                        onBlur={(e) => {
                          const v = Number(e.currentTarget.value);
                          if (!Number.isNaN(v) && v !== p.cost) updateField(p.id, { cost: v });
                        }}
                      />
                    ) : (
                      p.cost
                    )}
                  </td>

                  {/* ขาย */}
                  <td className="py-2 pr-3">
                    {isAdmin ? (
                      <input
                        className="input w-28"
                        type="number"
                        step="0.01"
                        disabled={busyKey === p.id}
                        defaultValue={p.price}
                        onBlur={(e) => {
                          const v = Number(e.currentTarget.value);
                          if (!Number.isNaN(v) && v !== p.price) updateField(p.id, { price: v });
                        }}
                      />
                    ) : (
                      p.price
                    )}
                  </td>

                  {/* สต็อก */}
                  <td className="py-2 pr-3">
                    {isAdmin ? (
                      <input
                        className="input w-24"
                        type="number"
                        disabled={busyKey === p.id}
                        defaultValue={p.stock}
                        onBlur={(e) => {
                          const v = Number(e.currentTarget.value);
                          if (Number.isInteger(v) && v !== p.stock) updateField(p.id, { stock: v });
                        }}
                      />
                    ) : (
                      p.stock
                    )}
                  </td>

                  <td className="py-2 text-right">
                    <button
                      className="btn border-red-200 text-red-600 hover:bg-red-50"
                      disabled={busyKey === p.id || !isAdmin}
                      onClick={() => deleteProduct(p.id, p.name)}
                      title={isAdmin ? "ลบ" : "เฉพาะ ADMIN"}
                    >
                      {busyKey === p.id ? "กำลังลบ..." : "ลบ"}
                    </button>
                  </td>
                </tr>
              ))}

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
