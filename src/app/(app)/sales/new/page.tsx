"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Item = { code: string; name: string; qty: number; price: number; discount?: number };
type Avail = { code: string; name: string | null; stock: number; safetyStock: number };

const to2 = (n: any) => {
  const x = Number(n || 0);
  return Math.round(x * 100) / 100;
};

const todayYMD = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

export default function NewSalePage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Item[]>([
    { code: "", name: "", qty: 1, price: 0, discount: 0 },
  ]);

  // ข้อมูล stock/safety จาก API
  const [availability, setAvailability] = useState<Record<string, Avail>>({});
  const [validatingStock, setValidatingStock] = useState(false);

  function updateItem(i: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function addRow() {
    setItems((prev) => [...prev, { code: "", name: "", qty: 1, price: 0, discount: 0 }]);
  }
  function removeRow(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  // รวมเงินฝั่ง UI (แสดงผลเท่านั้น)
  const totalBeforeVat = useMemo(
    () =>
      items.reduce(
        (s, it) =>
          s +
          (Number(it.qty) || 0) * (Number(it.price) || 0) -
          (Number(it.discount) || 0),
        0
      ),
    [items]
  );
  const vat = useMemo(() => to2(totalBeforeVat * 0.07), [totalBeforeVat]);
  const grand = useMemo(() => to2(totalBeforeVat + vat), [totalBeforeVat, vat]);

  // -------- ตรวจสต๊อกเรียลไทม์ (debounce 300ms) --------
  useEffect(() => {
    const timer = setTimeout(async () => {
      const codes = Array.from(
        new Set(items.map((x) => x.code.trim()).filter(Boolean))
      );
      if (!codes.length) {
        setAvailability({});
        return;
      }
      setValidatingStock(true);
      try {
        const res = await fetch(
          `/api/products/availability?codes=${encodeURIComponent(codes.join(","))}`,
          { cache: "no-store" }
        );
        const arr = (await res.json()) as Avail[];
        const map: Record<string, Avail> = {};
        for (const a of arr) map[a.code] = a;
        setAvailability(map);
      } catch {
        // เงียบ ๆ
      } finally {
        setValidatingStock(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [items]);

  // คำนวณรายการที่ “สต๊อกไม่พอ” และ “ต่ำกว่า safety”
  const stockIssues = useMemo(() => {
    const insufficient: { idx: number; code: string; need: number; have: number }[] = [];
    const belowSafety: { idx: number; code: string; stock: number; safety: number }[] = [];

    items.forEach((it, idx) => {
      const code = it.code.trim();
      if (!code || (it.qty || 0) <= 0) return;
      const info = availability[code];
      if (!info) return;
      if ((info.stock ?? 0) - (it.qty || 0) < 0) {
        insufficient.push({
          idx,
          code,
          need: it.qty || 0,
          have: info.stock ?? 0,
        });
      }
      if ((info.stock ?? 0) < (info.safetyStock ?? 0)) {
        belowSafety.push({
          idx,
          code,
          stock: info.stock ?? 0,
          safety: info.safetyStock ?? 0,
        });
      }
    });

    return { insufficient, belowSafety };
  }, [items, availability]);

  const blockSubmit = stockIssues.insufficient.length > 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // กันเผลอกดตอนสต๊อกไม่พอ
    if (blockSubmit) {
      const msg = stockIssues.insufficient
        .map((r) => `• ${r.code}: ต้องการ ${r.need} แต่คงเหลือ ${r.have}`)
        .join("\n");
      alert(`สต๊อกไม่พอสำหรับรายการต่อไปนี้:\n${msg}`);
      return;
    }

    setSaving(true);

    const f = new FormData(e.currentTarget);
    const rawItems = items
      .filter((it) => it.code.trim() && Number(it.qty) > 0)
      .map((it) => ([
        it.code.trim(),
        (it.name || it.code).trim(),
        Number(it.qty || 0),
        to2(it.price),
        to2(it.discount || 0),
      ]))
      // ลด payload: แปลงเป็น array แล้วค่อย map กลับเป็น object
      .map(([code, name, qty, price, discount]) => ({
        code: code as string,
        name: name as string,
        qty: qty as number,
        price: price as number,
        discount: discount as number,
      }));

    if (!rawItems.length) {
      alert("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 แถว");
      setSaving(false);
      return;
    }

    const payload = {
      // ไม่บังคับเลขเอกสาร ปล่อยให้แบ็กเอนด์ออกเลข
      docNo: String(f.get("docNo") || "").trim() || undefined,
      docDate: String(f.get("docDate") || todayYMD()),
      channel: String(f.get("channel") || "") || null,
      customer: {
        // **สำคัญ:** ส่งเฉพาะข้อมูล ไม่ส่ง id → ให้ API ตัดสินใจ findOrCreate
        name: String(f.get("cusName") || "").trim(),
        phone: String(f.get("cusPhone") || "").trim(),
        email: String(f.get("cusEmail") || "").trim(),
        address: String(f.get("cusAddr") || "").trim(),
      },
      items: rawItems,
    };

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(j?.message || "บันทึกไม่สำเร็จ");

      alert(`บันทึกสำเร็จ\nเลขเอกสาร: ${j?.docNo ?? "-"}`);
      router.push("/sales");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ปุ่มบันทึก/ยกเลิก */}
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
          disabled={saving || validatingStock || blockSubmit}
          title={blockSubmit ? "มีรายการสต๊อกไม่พอ" : undefined}
        >
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </div>

      {/* แบนเนอร์แจ้งเตือนสต๊อก */}
      {blockSubmit && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          พบ {stockIssues.insufficient.length} แถวที่สต๊อกไม่พอ — แก้ไขก่อนบันทึก
        </div>
      )}
      {!blockSubmit &&
        stockIssues.belowSafety.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700">
            มี {stockIssues.belowSafety.length} รายการที่ต่ำกว่า Safety Stock (ยังบันทึกได้)
          </div>
        )}

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
                <input name="docNo" className="input mt-1 w-full" placeholder="(ปล่อยว่างเพื่อให้ระบบออกเลข)" />
              </div>
              <div>
                <label className="text-sm">วันที่</label>
                <input name="docDate" type="date" className="input mt-1 w-full" defaultValue={todayYMD()} />
              </div>
              <div>
                <label className="text-sm">อ้างอิง</label>
                <input name="ref" className="input mt-1 w-full" placeholder="PO, ใบจอง ฯลฯ" />
              </div>
              <div>
                <label className="text-sm">ช่องทางการขาย</label>
                <select name="channel" className="input mt-1 w-full" defaultValue="">
                  <option value="" disabled>
                    กรุณาเลือก
                  </option>
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
                <input
                  name="cusName"
                  className="input mt-1 w-full"
                  placeholder="พิมพ์ชื่อ/รหัส"
                  required
                />
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
            <button
              type="button"
              onClick={addRow}
              className="rounded-xl border px-3 py-1.5 hover:bg-slate-50"
            >
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
                  <th className="py-3 px-4 w-[60px]"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const line =
                    (Number(it.qty) || 0) * (Number(it.price) || 0) -
                    (Number(it.discount) || 0);
                  const code = it.code.trim();
                  const info = code ? availability[code] : undefined;
                  const notEnough =
                    !!info && (info.stock ?? 0) - (Number(it.qty) || 0) < 0;
                  const underSafety =
                    !!info && (info.stock ?? 0) < (info.safetyStock ?? 0);

                  return (
                    <tr key={i} className="border-t">
                      <td className="py-2 px-4">
                        <input
                          className={`input w-full ${notEnough ? "border-red-300 bg-red-50" : ""}`}
                          value={it.code}
                          onChange={(e) => updateItem(i, { code: e.target.value })}
                        />
                        {info && (
                          <div className="mt-1 text-xs text-slate-500">
                            คงเหลือ: {info.stock} / Safety: {info.safetyStock}
                          </div>
                        )}
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
                          className={`input w-full text-right ${notEnough ? "border-red-300 bg-red-50" : ""}`}
                          value={it.qty}
                          min={0}
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
                        {to2(line).toLocaleString("th-TH", {
                          minimumFractionDigits: 2,
                        })}
                        {notEnough && (
                          <div className="text-xs text-red-600 mt-1">
                            สต๊อกไม่พอ (เหลือ {info?.stock ?? 0})
                          </div>
                        )}
                        {!notEnough && underSafety && (
                          <div className="text-xs text-amber-600 mt-1">
                            ต่ำกว่า Safety Stock
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <button
                          type="button"
                          className="rounded-lg border px-2 py-1 text-slate-600 hover:bg-slate-50"
                          onClick={() => removeRow(i)}
                          title="ลบแถว"
                        >
                          ลบ
                        </button>
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
                <div>
                  {to2(totalBeforeVat).toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>ภาษีมูลค่าเพิ่ม (7%)</div>
                <div>
                  {vat.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                </div>
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
