"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Line = {
  code: string;
  name: string;
  qty: number;
  price: number;
  discount: number;
  // availability
  stock?: number;
  safetyStock?: number;
  loading?: boolean;
};

type Availability = { code: string; name: string | null; stock: number; safetyStock: number };

const CHANNELS = ["TikTok", "Facebook", "Shopee", "Lazada", "หน้าร้าน"] as const;
const TAX_MODES = [
  { value: "INCLUSIVE", label: "รวมภาษี" },
  { value: "EXCLUSIVE", label: "แยกภาษี" },
] as const;

const fmtBaht = (n: number) =>
  (n || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function toIsoFromThai(ddmmyyyy: string): string {
  // รับ dd/MM/yyyy (พ.ศ.ก็ได้) -> yyyy-MM-dd (ค.ศ.)
  const m = ddmmyyyy.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return new Date().toISOString().slice(0, 10);
  const dd = +m[1], mm = +m[2] - 1; let yy = +m[3];
  if (yy > 2500) yy -= 543;
  const d = new Date(yy, mm, dd);
  const y = d.getFullYear(), mon = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mon}-${day}`;
}

function fromDateToThai(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear() + 543;
  return `${dd}/${mm}/${yy}`;
}

export default function NewSalePage() {
  const router = useRouter();

  // header
  const [docDate, setDocDate] = useState<string>(fromDateToThai(new Date()));
  const [channel, setChannel] = useState<string>(CHANNELS[0]);
  const [taxMode, setTaxMode] = useState<"INCLUSIVE" | "EXCLUSIVE">("INCLUSIVE");
  const [docNoPreview, setDocNoPreview] = useState<string>("กำลังออกเลข…");

  // customer
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custAddress, setCustAddress] = useState("");

  // lines
  const [lines, setLines] = useState<Line[]>([{ code: "", name: "", qty: 1, price: 0, discount: 0 }]);

  // save
  const [saving, setSaving] = useState(false);

  // load docNo preview (เปลี่ยนตามวันที่)
  async function refreshDocNoPreview(dateStr: string) {
    try {
      const iso = toIsoFromThai(dateStr);
      const r = await fetch(`/api/sales/preview-docno?date=${iso}`, { cache: "no-store" });
      const j = await r.json();
      setDocNoPreview(j?.preview || "-");
    } catch {
      setDocNoPreview("-");
    }
  }
  useEffect(() => { refreshDocNoPreview(docDate); }, [docDate]);

  // ดึง availability ของรหัสเดียว
  async function fetchAvailability(code: string): Promise<Availability | null> {
    if (!code.trim()) return null;
    const r = await fetch(`/api/products/availability?codes=${encodeURIComponent(code.trim())}`, { cache: "no-store" });
    const j = await r.json().catch(() => []);
    const row = Array.isArray(j) ? j.find((x: any) => x.code === code.trim()) : null;
    if (!row) return null;
    return { code: row.code, name: row.name, stock: Number(row.stock || 0), safetyStock: Number(row.safetyStock || 0) };
  }

  // เปลี่ยนค่าในบรรทัด
  function updateLine(i: number, patch: Partial<Line>) {
    setLines(prev => prev.map((ln, idx) => (idx === i ? { ...ln, ...patch } : ln)));
  }

  async function onCodeChange(i: number, value: string) {
    updateLine(i, { code: value, loading: true });
    const info = await fetchAvailability(value).catch(() => null);
    if (info) {
      updateLine(i, {
        loading: false,
        name: info.name || value,
        stock: info.stock,
        safetyStock: info.safetyStock,
      });
    } else {
      updateLine(i, { loading: false, name: value, stock: undefined, safetyStock: undefined });
    }
  }

  function addRow() {
    setLines(prev => [...prev, { code: "", name: "", qty: 1, price: 0, discount: 0 }]);
  }
  function removeRow(i: number) {
    setLines(prev => prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i));
  }

  // คำนวณยอด (รวม/แยกภาษี)
  const totals = useMemo(() => {
    const subtotal = lines.reduce((a, x) => a + (x.qty * x.price - x.discount), 0);
    if (taxMode === "EXCLUSIVE") {
      const vat = subtotal * 0.07;
      return { subtotal, vat, grand: subtotal + vat };
    } else {
      const vat = subtotal * 7 / 107;
      return { subtotal, vat, grand: subtotal };
    }
  }, [lines, taxMode]);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const body = {
        docDate: toIsoFromThai(docDate),
        channel,
        taxMode, // ส่งให้ API คำนวณตามโหมดภาษี
        customer: {
          name: custName, phone: custPhone, email: custEmail, address: custAddress,
        },
        items: lines
          .filter(l => (l.code || l.name) && l.qty > 0)
          .map(l => ({ code: l.code.trim(), name: l.name.trim(), qty: l.qty, price: l.price, discount: l.discount })),
      };

      const r = await fetch("/api/sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok || j?.ok === false) throw new Error(j?.message || "บันทึกไม่สำเร็จ");

      alert("บันทึกเสร็จแล้ว");
      router.push("/sales");
    } catch (e: any) {
      alert(e?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">สร้างออเดอร์</h1>

      {/* ส่วนหัว */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* ซ้าย: ข้อมูลเอกสาร */}
        <div className="card">
          <div className="card-body space-y-3">
            <div className="text-slate-600">เลขเอกสาร</div>
            <input className="input bg-slate-50" value={docNoPreview} readOnly />

            <div className="text-slate-600">วันที่</div>
            <input
              className="input"
              placeholder="dd/MM/yyyy"
              value={docDate}
              onChange={(e) => setDocDate(e.target.value)}
            />

            <div className="text-slate-600">อ้างอิง</div>
            <input className="input" placeholder="PO, ใบจอง ฯลฯ" />

            <div className="text-slate-600">ช่องทางการขาย</div>
            <select className="input" value={channel} onChange={(e) => setChannel(e.target.value)}>
              {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <div className="text-slate-600">ประเภทภาษี</div>
            <select
              className="input"
              value={taxMode}
              onChange={(e) => setTaxMode(e.target.value as "INCLUSIVE" | "EXCLUSIVE")}
            >
              {TAX_MODES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        {/* ขวา: ลูกค้า */}
        <div className="card">
          <div className="card-body grid gap-3">
            <div className="text-slate-600">ชื่อลูกค้า</div>
            <input className="input" placeholder="พิมพ์ชื่อลูกค้า" value={custName} onChange={(e) => setCustName(e.target.value)} />
            <div className="text-slate-600">เบอร์โทรศัพท์ลูกค้า</div>
            <input className="input" placeholder="เช่น 0950000000" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} />
            <div className="text-slate-600">อีเมลลูกค้า</div>
            <input className="input" placeholder="someone@email.com" value={custEmail} onChange={(e) => setCustEmail(e.target.value)} />
            <div className="text-slate-600">ที่อยู่ลูกค้า</div>
            <textarea className="input" rows={3} placeholder="ที่อยู่ออกเอกสาร/จัดส่ง" value={custAddress} onChange={(e) => setCustAddress(e.target.value)} />
          </div>
        </div>
      </div>

      {/* รายการสินค้า */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-3">
            <div className="text-slate-700 font-medium">รายการสินค้า</div>
            <button className="btn" onClick={addRow}>+ เพิ่มแถว</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="py-2 pr-3 w-40">รหัส</th>
                  <th className="py-2 pr-3">ชื่อสินค้า</th>
                  <th className="py-2 pr-3 w-24">จำนวน</th>
                  <th className="py-2 pr-3 w-28">ราคา/หน่วย</th>
                  <th className="py-2 pr-3 w-28">ส่วนลด</th>
                  <th className="py-2 pr-3 w-28">จำนวนเงิน</th>
                  <th className="py-2 pr-0 w-24 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((ln, i) => {
                  const amount = ln.qty * ln.price - ln.discount;
                  const low = typeof ln.stock === "number" && typeof ln.safetyStock === "number" && ln.stock < ln.safetyStock;
                  return (
                    <tr key={i} className="border-t align-top">
                      <td className="py-2 pr-3">
                        <input
                          className="input"
                          value={ln.code}
                          onChange={(e) => onCodeChange(i, e.target.value)}
                          placeholder="รหัส"
                        />
                        {/* availability */}
                        {ln.loading ? (
                          <div className="mt-1 text-[12px] text-slate-400">กำลังเช็คสต๊อก…</div>
                        ) : typeof ln.stock === "number" ? (
                          <div className={`mt-1 text-[12px] px-2 py-0.5 rounded ${low ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                            สต๊อก {ln.stock.toLocaleString("th-TH")} | Safety {ln.safetyStock?.toLocaleString("th-TH")}
                            {low && <b className="ml-1">สต๊อกใกล้หมด</b>}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3">
                        <input className="input" value={ln.name} onChange={(e) => updateLine(i, { name: e.target.value })} placeholder="ชื่อสินค้า" />
                      </td>
                      <td className="py-2 pr-3">
                        <input className="input" type="number" value={ln.qty} onChange={(e) => updateLine(i, { qty: Number(e.target.value) })} />
                      </td>
                      <td className="py-2 pr-3">
                        <input className="input" type="number" value={ln.price} onChange={(e) => updateLine(i, { price: Number(e.target.value) })} />
                      </td>
                      <td className="py-2 pr-3">
                        <input className="input" type="number" value={ln.discount} onChange={(e) => updateLine(i, { discount: Number(e.target.value) })} />
                      </td>
                      <td className="py-2 pr-3 align-middle">฿{fmtBaht(amount)}</td>
                      <td className="py-2 pr-0">
                        <div className="flex justify-end">
                          <button className="btn border-red-200 text-red-600 hover:bg-red-50" onClick={() => removeRow(i)}>ลบ</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* สรุปยอด */}
            <div className="mt-6 grid gap-2 w-full max-w-sm ml-auto">
              <div className="flex justify-between text-slate-600">
                <div>{taxMode === "EXCLUSIVE" ? "รวมก่อนภาษี" : "มูลค่ารวม (รวมภาษี)"}</div>
                <div>฿{fmtBaht(totals.subtotal)}</div>
              </div>
              <div className="flex justify-between text-slate-600">
                <div>ภาษีมูลค่าเพิ่ม (7%)</div>
                <div>฿{fmtBaht(totals.vat)}</div>
              </div>
              <div className="flex justify-between items-center rounded-xl bg-slate-100 px-4 py-3 font-semibold">
                <div>รวมสุทธิ</div>
                <div>฿{fmtBaht(totals.grand)}</div>
              </div>
            </div>
          </div>

          {/* ปุ่มบันทึก */}
          <div className="card-footer flex justify-end gap-2">
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
