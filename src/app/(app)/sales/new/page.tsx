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
  // ✅ บังคับรูปแบบ YYYY-MM-DD (ค.ศ.) สำหรับ <input type="date">
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

  // รวมเงินฝั่ง UI
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

  // ตรวจสต๊อกเรียลไทม์ (debounce 300ms)
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
      docNo: String(f.get("docNo") || "").trim() || undefined,
      // ✅ ส่งรูปแบบ YYYY-MM-DD (ค.ศ.) เสมอ
      docDate: String(f.get("docDate") || todayYMD()),
      channel: String(f.get("channel") || "") || null,
      customer: {
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

      {/* แจ้งเตือนสต๊อก */}
      {blockSubmit && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          พบ {stockIssues.insufficient.length} แถวที่สต๊อกไม่พอ — แก้ไขก่อนบันทึก
        </div>
      )}
      {!blockSubmit && stockIssues.belowSafety.length > 0 && (
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

        {/* ตารางรายการสินค้า — (เหมือนเดิมทั้งหมด) */}
        {/* ... (คงโค้ดเดิมของคุณจากส่วนนี้ลงไปจนจบไฟล์) ... */}
        {/* เพื่อความสั้น ผมตัดส่วน “ตารางสินค้า + สรุปรวม” ออก แต่ในโปรเจกต์ให้คงเหมือนเดิมนะครับ */}
      </form>
    </div>
  );
}
