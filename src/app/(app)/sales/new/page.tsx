"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = { code: string; name: string; qty: number; price: number; discount?: number };

const to2 = (n: any) => {
  const x = Number(n || 0);
  return Math.round(x * 100) / 100;
};

export default function NewSalePage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Item[]>([
    { code: "", name: "", qty: 1, price: 0, discount: 0 },
  ]);

  function updateItem(i: number, patch: Partial<Item>) {
    setItems(prev => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function addRow() {
    setItems(prev => [...prev, { code: "", name: "", qty: 1, price: 0, discount: 0 }]);
  }

  // รวมเงินฝั่ง UI (แสดงผลเท่านั้น)
  const totalBeforeVat = items.reduce(
    (s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0) - (Number(it.discount) || 0),
    0
  );
  const vat = to2(totalBeforeVat * 0.07);
  const grand = to2(totalBeforeVat + vat);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const f = new FormData(e.currentTarget);
    const rawItems = items
      .filter((it) => it.code.trim() && Number(it.qty) > 0)
      .map((it) => ({
        code: it.code.trim(),
        name: (it.name || it.code).trim(),
        qty: Number(it.qty || 0),
        price: to2(it.price),
        discount: to2(it.discount || 0),
      }));

    if (!rawItems.length) {
      alert("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 แถว");
      setSaving(false);
      return;
    }

    const payload = {
      docNo: String(f.get("docNo") || "").trim(),
      // ถ้า user ไม่ใส่วัน ให้ใช้เวลาปัจจุบัน
      docDate: String(f.get("docDate") || new Date().toISOString()),
      channel: String(f.get("channel") || "") || null,
      customer: {
        name: String(f.get("cusName") || ""),
        phone: String(f.get("cusPhone") || ""),
        email: String(f.get("cusEmail") || ""),
        address: String(f.get("cusAddr") || ""),
      },
      items: rawItems, // ← รูปแบบที่แบ็กเอนด์ต้องการ
    };

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(j?.message || "บันทึกไม่สำเร็จ");

      alert("บันทึกสำเร็จ");
      router.push("/sales"); // กลับหน้ารายการ
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ปุ่มอยู่นอกฟอร์ม ใช้ form="saleForm" */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          className="rounded-xl border px-4 py-2"
          onClick={() => router.push("/sales")}
          disabled={saving}
        >
          ยกเลิก
        </button>
        <button
          form="saleForm"
          type="submit"
          className="rounded-xl bg-blue-600 text-white px-4 py-2 disabled:opacity-60"
          disabled={saving}
        >
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </div>

      {/* ฟอร์มหลัก */}
      <form id="saleForm" onSubmit={onSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* ซ้าย: ข้อมูลเอกสาร */}
          <div className="rounded-2xl border bg-white">
            <div className="p-5 border-b">
              <h2 className="font-semibold text-lg">ข้อมูล</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm">รายการ</label>
                <input name="docNo" className="input mt-1 w-full" defaultValue="SO-202510001" required />
              </div>
              <div>
                <label className="text-sm">วันที่</label>
                <input name="docDate" type="date" className="input mt-1 w-full" />
              </div>
              <div>
                <label className="text-sm">อ้างอิง</label>
                <input name="ref" className="input mt-1 w-full" placeholder="PO, ใบจอง ฯลฯ" />
              </div>
              <div>
                <label className="text-sm">ช่องทางการขาย</label>
                <select name="channel" className="input mt-1 w-full" defaultValue="">
                  <option value="" disabled>กรุณาเลือก</option>
                  <option value="TikTok">TikTok</option>
                  <option value="Facebook">Facebook</option>
                  <option value="หน้าร้าน">หน้าร้าน</option>
                </select>
              </div>
              <div>
                <label className="text-sm">ประเภทภาษี (เฉพาะแสดงผล)</label>
                <select name="taxType" className="input mt-1 w-full" defaultValue="ไม่มีภาษี">
                  <option>ไม่มีภาษี</option>
                  <option>แยกภาษี</option>
                  <option>รวมภาษี</option>
                </select>
              </div>
            </div>
          </div>

          {/* ขวา: ลูกค้า */}
          <div className="rounded-2xl border bg-white">
            <div className="p-5 border-b">
              <h2 className="font-semibold text-lg">ลูกค้า</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm">ชื่อลูกค้า</label>
                <input name="cusName" className="input mt-1 w-full" placeholder="พิมพ์ชื่อ/รหัส" required />
              </div>
              <div>
                <label className="text-sm">เบอร์โทรศัพท์ลูกค้า</label>
                <input name="cusPhone" className="input mt-1 w-full" />
              </div>
              <div>
                <label className="text-sm">อีเมลลูกค้า</label>
                <input name="cusEmail" type="email" className="input mt-1 w-full" />
              </div>
              <div>
                <label className="text-sm">ที่อยู่ลูกค้า</label>
                <textarea name="cusAddr" className="input mt-1 w-full h-28" />
              </div>
            </div>
          </div>
        </div>

        {/* รายการสินค้า */}
        <div className="rounded-2xl border bg-white">
          <div className="p-5 border-b flex items-center justify-between">
            <h2 className="font-semibold text-lg">รายการสินค้า</h2>
            <button type="button" onClick={addRow} className="rounded-xl border px-3 py-1.5 hover:bg-slate-50">
              + เพิ่มแถว
            </button>
          </div>
          <div className="p-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="py-3 px-4 w-[140px]">รหัส</th>
                  <th className="py-3 px-4">ชื่อสินค้า</th>
                  <th className="py-3 px-4 w-[120px]">จำนวน</th>
                  <th className="py-3 px-4 w-[160px]">ราคา/หน่วย</th>
                  <th className="py-3 px-4 w-[140px]">ส่วนลด</th>
                  <th className="py-3 px-4 w-[140px] text-right">จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const line =
                    (Number(it.qty) || 0) * (Number(it.price) || 0) - (Number(it.discount) || 0);
                  return (
                    <tr key={i} className="border-t">
                      <td className="py-2 px-4">
                        <input
                          className="input w-full"
                          value={it.code}
                          onChange={(e) => updateItem(i, { code: e.target.value })}
                        />
                      </td>
                      <td className="py-2 px-4">
                        <input
                          className="input w-full"
                          value={it.name}
                          onChange={(e) => updateItem(i, { name: e.target.value })}
                        />
                      </td>
                      <td className="py-2 px-4">
                        <input
                          type="number"
                          className="input w-full text-right"
                          value={it.qty}
                          onChange={(e) => updateItem(i, { qty: Number(e.target.value) })}
                        />
                      </td>
                      <td className="py-2 px-4">
                        <input
                          type="number"
                          className="input w-full text-right"
                          value={it.price}
                          onChange={(e) => updateItem(i, { price: Number(e.target.value) })}
                        />
                      </td>
                      <td className="py-2 px-4">
                        <input
                          type="number"
                          className="input w-full text-right"
                          value={it.discount ?? 0}
                          onChange={(e) => updateItem(i, { discount: Number(e.target.value) })}
                        />
                      </td>
                      <td className="py-2 px-4 text-right">
                        {to2(line).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* สรุปรวม (แสดงผล) */}
          <div className="p-5 grid md:grid-cols-2 gap-6 border-t">
            <div />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>รวมก่อนภาษี</div>
                <div>{to2(totalBeforeVat).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="flex items-center justify-between">
                <div>ภาษีมูลค่าเพิ่ม (7%)</div>
                <div>{vat.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="mt-3 rounded-xl bg-slate-100 p-4 flex items-center justify-between font-semibold">
                <div>รวมสุทธิ</div>
                <div className="text-xl">
                  {grand.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

