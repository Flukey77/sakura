"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Line = {
  code: string;
  name: string;
  qty: number;
  price: number;
  discount: number;
  // สำหรับ safety hint
  stock?: number;
  safetyStock?: number;
  checking?: boolean;
};

const baht = (n: number) => (n || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ----- helper แปลงวันที่ -----
const toDateFromThai = (s: string) => {
  // คาดรูปแบบ dd/MM/yyyy (ทั้ง ค.ศ./พ.ศ.)
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return new Date(); // fallback วันนี้
  const dd = +m[1], mm = +m[2] - 1; let yyyy = +m[3];
  if (yyyy > 2500) yyyy -= 543; // พ.ศ. -> ค.ศ.
  return new Date(yyyy, mm, dd);
};
const fmtThaiDDMMYYYY = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear(); // ใช้ ค.ศ.
  return `${dd}/${mm}/${yyyy}`;
};

export default function SalesNewPage() {
  const router = useRouter();

  // ฟอร์มส่วนหัว
  const [docDateText, setDocDateText] = useState(fmtThaiDDMMYYYY(new Date()));
  const [refNote, setRefNote] = useState("");
  const [channel, setChannel] = useState("TikTok");
  const [vatMode, setVatMode] = useState<"INC">("INC");

  // ลูกค้า
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custAddress, setCustAddress] = useState("");

  // รายการ
  const [lines, setLines] = useState<Line[]>([{ code: "", name: "", qty: 1, price: 0, discount: 0 }]);

  // สถานะบันทึก
  const [saving, setSaving] = useState(false);
  // เก็บ docNo ที่ได้ตอนบันทึก (เอาไว้โชว์ read-only)
  const [docNo, setDocNo] = useState<string>("");

  const addRow = () => setLines((xs) => [...xs, { code: "", name: "", qty: 1, price: 0, discount: 0 }]);
  const delRow = (idx: number) => setLines((xs) => xs.filter((_, i) => i !== idx));

  const update = (idx: number, key: keyof Line, val: any) => {
    setLines((xs) => xs.map((r, i) => (i === idx ? { ...r, [key]: val } : r)));
  };

  // เมื่อพิมพ์รหัสสินค้า → เรียก API availability แล้วติดป้าย stock/safety
  const checkAvailability = async (idx: number, code: string) => {
    update(idx, "checking", true);
    try {
      if (!code) {
        update(idx, "stock", undefined);
        update(idx, "safetyStock", undefined);
        return;
      }
      const res = await fetch(`/api/products/availability?codes=${encodeURIComponent(code)}`, { cache: "no-store" });
      const arr = (await res.json()) as Array<{ code: string; name: string | null; stock: number; safetyStock: number }>;
      const row = arr?.[0];
      update(idx, "stock", row?.stock ?? 0);
      update(idx, "safetyStock", row?.safetyStock ?? 0);
      if (!lines[idx]?.name && row?.name) update(idx, "name", row.name);
      if (!lines[idx]?.price && row) update(idx, "price", Number(row?.stock >= 0 ? lines[idx].price : 0)); // ไม่บังคับราคา
    } catch {
      update(idx, "stock", undefined);
      update(idx, "safetyStock", undefined);
    } finally {
      update(idx, "checking", false);
    }
  };

  // คำนวนยอด
  const totals = useMemo(() => {
    const sub = lines.reduce((a, x) => a + (x.qty * x.price - (x.discount || 0)), 0);
    const vat = sub * 0.07;
    const grand = sub + vat;
    return { sub, vat, grand };
  }, [lines]);

  async function save() {
    setSaving(true);
    try {
      const body = {
        docDate: fmtThaiDDMMYYYY(toDateFromThai(docDateText)), // ส่ง dd/MM/yyyy แต่ฝั่ง API รองรับ
        channel,
        docNo: "", // ให้ระบบออกเลขเอง
        customer: { name: custName, phone: custPhone, email: custEmail, address: custAddress },
        items: lines
          .filter((x) => (x.code || x.name) && Number(x.qty) > 0)
          .map((x) => ({ code: x.code.trim(), name: x.name.trim(), qty: Number(x.qty||0), price: Number(x.price||0), discount: Number(x.discount||0) })),
      };

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok || j?.ok === false) throw new Error(j?.message || "บันทึกไม่สำเร็จ");

      setDocNo(j.docNo || "");
      alert(`บันทึกเสร็จแล้ว\nเลขเอกสาร: ${j.docNo}`);
      router.push("/sales");
    } catch (e: any) {
      alert(e?.message ?? "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">สร้างออเดอร์</h1>

      {/* ส่วนหัวซ้าย-ขวา */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <div className="card-body space-y-3">
            <div className="text-slate-500">ข้อมูล</div>

            {/* เลขเอกสาร (ออกตอนบันทึก) */}
            <div>
              <label className="text-sm text-slate-500">เลขเอกสาร</label>
              <input className="input w-full bg-slate-50" value={docNo || "ออกเลขเอกสารเมื่อบันทึก"} readOnly />
            </div>

            <div>
              <label className="text-sm text-slate-500">วันที่ (วัน/เดือน/ปี)</label>
              <div className="relative">
                <input
                  className="input w-full"
                  placeholder="dd/MM/yyyy"
                  value={docDateText}
                  onChange={(e) => setDocDateText(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-500">อ้างอิง</label>
              <input className="input w-full" placeholder="PO, ใบจอง ฯลฯ" value={refNote} onChange={(e) => setRefNote(e.target.value)} />
            </div>

            <div>
              <label className="text-sm text-slate-500">ช่องทางการขาย</label>
              <select className="input w-full" value={channel} onChange={(e) => setChannel(e.target.value)}>
                <option>TikTok</option>
                <option>Facebook</option>
                <option>LINE</option>
                <option>Shopee</option>
                <option>Lazada</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-500">ประเภทภาษี (เฉพาะแสดงผล)</label>
              <select className="input w-full" value={vatMode} onChange={(e) => setVatMode(e.target.value as any)}>
                <option value="INC">รวมภาษี</option>
              </select>
            </div>
          </div>
        </div>

        {/* ลูกค้า */}
        <div className="card">
          <div className="card-body space-y-3">
            <div className="text-slate-500">ลูกค้า</div>
            <div>
              <label className="text-sm text-slate-500">ชื่อลูกค้า</label>
              <input className="input w-full" placeholder="พิมพ์ชื่อลูกค้า" value={custName} onChange={(e) => setCustName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-slate-500">เบอร์โทรศัพท์ลูกค้า</label>
              <input className="input w-full" placeholder="เช่น 0950000000" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-slate-500">อีเมลลูกค้า</label>
              <input className="input w-full" placeholder="someone@email.com" value={custEmail} onChange={(e) => setCustEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-slate-500">ที่อยู่ลูกค้า</label>
              <textarea className="input w-full min-h-[96px]" placeholder="ที่อยู่สำหรับจัดส่ง/ออกเอกสาร" value={custAddress} onChange={(e) => setCustAddress(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* รายการสินค้า */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-3">
            <div className="text-slate-600">รายการสินค้า</div>
            <button className="btn" onClick={addRow}>+ เพิ่มแถว</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3 w-[140px]">รหัส</th>
                  <th className="py-2 pr-3">ชื่อสินค้า</th>
                  <th className="py-2 pr-3 w-[120px]">จำนวน</th>
                  <th className="py-2 pr-3 w-[140px]">ราคา/หน่วย</th>
                  <th className="py-2 pr-3 w-[140px]">ส่วนลด</th>
                  <th className="py-2 pr-3 w-[140px] text-right">จำนวนเงิน</th>
                  <th className="py-2 w-[80px] text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((ln, i) => {
                  const amount = ln.qty * ln.price - (ln.discount || 0);
                  const low = typeof ln.stock === "number" && typeof ln.safetyStock === "number" && ln.stock < ln.safetyStock;
                  return (
                    <tr key={i} className="border-t align-top">
                      <td className="py-2 pr-3">
                        <input
                          className="input w-[120px]"
                          value={ln.code}
                          onChange={(e) => {
                            const v = e.target.value.toUpperCase();
                            update(i, "code", v);
                            if (v.length >= 1) checkAvailability(i, v);
                          }}
                          placeholder=""
                        />
                        {/* hint safety */}
                        {(typeof ln.stock === "number" && typeof ln.safetyStock === "number") && (
                          <div className={`mt-1 text-xs px-2 py-1 rounded ${low ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                            สต๊อก: {ln.stock} | Safety: {ln.safetyStock} {low ? "— เหลือน้อย!" : ""}
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <input className="input w-full" value={ln.name} onChange={(e) => update(i, "name", e.target.value)} />
                      </td>
                      <td className="py-2 pr-3">
                        <input className="input w-[110px]" type="number" value={ln.qty} onChange={(e) => update(i, "qty", Number(e.target.value))} />
                      </td>
                      <td className="py-2 pr-3">
                        <input className="input w-[130px]" type="number" value={ln.price} onChange={(e) => update(i, "price", Number(e.target.value))} />
                      </td>
                      <td className="py-2 pr-3">
                        <input className="input w-[130px]" type="number" value={ln.discount} onChange={(e) => update(i, "discount", Number(e.target.value))} />
                      </td>
                      <td className="py-2 pr-3 text-right align-middle">฿{baht(amount)}</td>
                      <td className="py-2 text-right">
                        <button className="btn border-red-200 text-red-600 hover:bg-red-50" onClick={() => delRow(i)}>ลบ</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* สรุปยอด */}
            <div className="mt-6 ml-auto w-full max-w-[420px] space-y-2">
              <div className="flex justify-between text-slate-600">
                <div>รวมก่อนภาษี</div>
                <div>฿{baht(totals.sub)}</div>
              </div>
              <div className="flex justify-between text-slate-600">
                <div>ภาษีมูลค่าเพิ่ม (7%)</div>
                <div>฿{baht(totals.vat)}</div>
              </div>
              <div className="flex justify-between px-4 py-3 rounded-xl bg-slate-100 font-semibold text-lg">
                <div>รวมสุทธิ</div>
                <div>฿{baht(totals.grand)}</div>
              </div>
            </div>
          </div>

          {/* ปุ่ม */}
          <div className="mt-6 flex gap-2 justify-end">
            <button className="btn" onClick={() => router.push("/sales")}>ยกเลิก</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? "กำลังบันทึก…" : "บันทึก"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
