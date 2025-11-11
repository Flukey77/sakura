// src/app/(app)/sales/new/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Item = {
  code: string;
  name: string;
  qty: number;
  price: number;
  discount: number;
};

type Payload = {
  date: string; // YYYY-MM-DD (ค.ศ. จาก input type="date")
  ref: string;
  channel: string;
  taxType: "รวมภาษี" | "ไม่รวมภาษี";
  customer: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  items: Item[];
};

const CHANNELS = ["TikTok", "Facebook", "Shopee", "Lazada", "อื่น ๆ"] as const;

export default function NewSalePage() {
  const router = useRouter();

  // วันที่ default = วันนี้ (รูปแบบที่ <input type="date"> ใช้: YYYY-MM-DD, ค.ศ.)
  const today = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const defaultDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  // ฟอร์มหลัก
  const [date, setDate] = useState<string>(defaultDate);
  const [ref, setRef] = useState<string>("");
  const [channel, setChannel] = useState<string>("TikTok");
  const [taxType, setTaxType] = useState<"รวมภาษี" | "ไม่รวมภาษี">("รวมภาษี");

  // ลูกค้า (อนุญาตให้พิมพ์ชื่ออย่างเดียวได้ ถ้าต้องการบันทึกเบอร์/อีเมล/ที่อยู่ ก็พิมพ์เพิ่มได้เลย)
  const [custName, setCustName] = useState<string>("");
  const [custPhone, setCustPhone] = useState<string>("");
  const [custEmail, setCustEmail] = useState<string>("");
  const [custAddr, setCustAddr] = useState<string>("");

  // รายการสินค้า (เริ่ม 1 แถวเหมือนรูป)
  const [items, setItems] = useState<Item[]>([
    { code: "", name: "", qty: 1, price: 0, discount: 0 },
  ]);

  const addRow = () =>
    setItems((rows) => [...rows, { code: "", name: "", qty: 1, price: 0, discount: 0 }]);

  const removeRow = (idx: number) =>
    setItems((rows) => rows.filter((_, i) => i !== idx));

  const changeRow = <K extends keyof Item>(idx: number, key: K, val: Item[K]) => {
    setItems((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: val } : r)));
  };

  // รวมเงิน
  const subtotal = useMemo(
    () =>
      items.reduce((sum, r) => {
        const line = Number(r.qty || 0) * Number(r.price || 0) - Number(r.discount || 0);
        return sum + Math.max(0, line);
      }, 0),
    [items]
  );

  // แบบในสกรีนช็อต: ภาษี 7% คิดเพิ่มจากยอดก่อนภาษี
  const vatRate = 0.07;
  const vat = taxType === "รวมภาษี" ? subtotal * vatRate : 0;
  const grand = subtotal + vat;

  const fmt = (n: number) => (n || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!custName.trim()) {
      alert("กรุณากรอกชื่อลูกค้าอย่างน้อย 1 รายการ");
      return;
    }
    if (items.length === 0 || items.every((r) => !r.name && !r.code)) {
      alert("กรุณาใส่รายการสินค้าอย่างน้อย 1 แถว");
      return;
    }

    const payload: Payload = {
      date, // ค.ศ.
      ref,
      channel,
      taxType,
      customer: {
        name: custName.trim(),
        phone: custPhone.trim() || undefined,
        email: custEmail.trim() || undefined,
        address: custAddr.trim() || undefined,
      },
      items: items.map((r) => ({
        code: (r.code || "").trim(),
        name: (r.name || "").trim(),
        qty: Number(r.qty || 0),
        price: Number(r.price || 0),
        discount: Number(r.discount || 0),
      })),
    };

    setSaving(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({} as any));
      if (!res.ok || j?.ok === false) {
        throw new Error(j?.message || "บันทึกไม่สำเร็จ");
      }
      // กลับไปหน้ารายการขาย
      router.push("/sales");
    } catch (e: any) {
      alert(e?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* หัวเรื่อง + ปุ่ม */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">สร้างออเดอร์</h1>
        <div className="flex gap-2">
          <button className="btn" onClick={() => router.push("/sales")}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>

      {/* ฟอร์มหลัก */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* กล่องซ้าย: ข้อมูลเอกสาร */}
        <div className="card">
          <div className="card-body space-y-3">
            <div className="text-slate-600 font-medium">ข้อมูล</div>

            <div>
              <div className="mb-1 text-sm text-slate-500">วันที่</div>
              <div className="relative">
                <input
                  type="date"
                  className="input w-full"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="mb-1 text-sm text-slate-500">อ้างอิง</div>
              <input
                className="input w-full"
                placeholder="PO, ใบจอง ฯลฯ"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
              />
            </div>

            <div>
              <div className="mb-1 text-sm text-slate-500">ช่องทางการขาย</div>
              <select
                className="input w-full"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-1 text-sm text-slate-500">ประเภทภาษี (เฉพาะแสดงผล)</div>
              <select
                className="input w-full"
                value={taxType}
                onChange={(e) => setTaxType(e.target.value as any)}
              >
                <option value="รวมภาษี">รวมภาษี</option>
                <option value="ไม่รวมภาษี">ไม่รวมภาษี</option>
              </select>
            </div>
          </div>
        </div>

        {/* กล่องขวา: ลูกค้า */}
        <div className="card">
          <div className="card-body space-y-3">
            <div className="text-slate-600 font-medium">ลูกค้า</div>

            <div>
              <div className="mb-1 text-sm text-slate-500">ชื่อลูกค้า</div>
              <input
                className="input w-full"
                placeholder="พิมพ์ชื่อลูกค้า"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
              />
            </div>

            <div>
              <div className="mb-1 text-sm text-slate-500">เบอร์โทรศัพท์ลูกค้า</div>
              <input
                className="input w-full"
                placeholder="เช่น 0950000000"
                value={custPhone}
                onChange={(e) => setCustPhone(e.target.value)}
              />
            </div>

            <div>
              <div className="mb-1 text-sm text-slate-500">อีเมลลูกค้า</div>
              <input
                className="input w-full"
                placeholder="someone@email.com"
                value={custEmail}
                onChange={(e) => setCustEmail(e.target.value)}
              />
            </div>

            <div>
              <div className="mb-1 text-sm text-slate-500">ที่อยู่ลูกค้า</div>
              <textarea
                className="input w-full min-h-[96px]"
                placeholder="ที่อยู่สำหรับจัดส่ง/ออกเอกสาร"
                value={custAddr}
                onChange={(e) => setCustAddr(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ตารางสินค้า */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-3">
            <div className="text-slate-600 font-medium">รายการสินค้า</div>
            <button className="btn" onClick={addRow}>+ เพิ่มแถว</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="py-2 pr-3 w-28">รหัส</th>
                  <th className="py-2 pr-3">ชื่อสินค้า</th>
                  <th className="py-2 pr-3 w-24">จำนวน</th>
                  <th className="py-2 pr-3 w-28">ราคา/หน่วย</th>
                  <th className="py-2 pr-3 w-24">ส่วนลด</th>
                  <th className="py-2 pr-3 w-28 text-right">จำนวนเงิน</th>
                  <th className="py-2 w-20 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r, i) => {
                  const line = Math.max(0, Number(r.qty || 0) * Number(r.price || 0) - Number(r.discount || 0));
                  return (
                    <tr key={i} className="border-t">
                      <td className="py-2 pr-3">
                        <input
                          className="input w-full"
                          value={r.code}
                          onChange={(e) => changeRow(i, "code", e.target.value)}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          className="input w-full"
                          value={r.name}
                          onChange={(e) => changeRow(i, "name", e.target.value)}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          className="input w-full"
                          type="number"
                          min={0}
                          value={r.qty}
                          onChange={(e) => changeRow(i, "qty", Number(e.target.value))}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          className="input w-full"
                          type="number"
                          min={0}
                          value={r.price}
                          onChange={(e) => changeRow(i, "price", Number(e.target.value))}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          className="input w-full"
                          type="number"
                          min={0}
                          value={r.discount}
                          onChange={(e) => changeRow(i, "discount", Number(e.target.value))}
                        />
                      </td>
                      <td className="py-2 pr-3 text-right align-middle">
                        ฿{fmt(line)}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          className="btn border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => removeRow(i)}
                          disabled={items.length <= 1}
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* สรุปยอด */}
            <div className="mt-6 max-w-md ml-auto space-y-2">
              <div className="flex justify-between">
                <div className="text-slate-600">รวมก่อนภาษี</div>
                <div>฿{fmt(subtotal)}</div>
              </div>
              <div className="flex justify-between">
                <div className="text-slate-600">ภาษีมูลค่าเพิ่ม (7%)</div>
                <div>฿{fmt(vat)}</div>
              </div>
              <div className="rounded-xl bg-slate-100 py-3 px-4 flex justify-between font-semibold">
                <div>รวมสุทธิ</div>
                <div>฿{fmt(grand)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
