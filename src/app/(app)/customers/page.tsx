// src/app/(app)/customers/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Customer = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  tags: string[];
  note?: string | null;
  createdAt: string;
};

type ApiRes = {
  ok: boolean;
  items?: Customer[];
  page?: number;
  pageSize?: number;
  total?: number;
  pages?: number;
  error?: string;
};

// helper: สร้างชุดเลขหน้าที่จะแสดง (… 3 4 [5] 6 7 …)
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

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20); // ถ้าจะให้เลือกได้ ค่อยทำ dropdown เพิ่มภายหลัง
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // ป้องกันเคส race condition: ขอรอบใหม่แต่วงเก่ามา response ช้ากว่า
  const reqId = useRef(0);

  const load = useCallback(
    async (p = page) => {
      setLoading(true);
      setErrorMsg(null);
      const myId = ++reqId.current;
      try {
        const url = `/api/customers?q=${encodeURIComponent(q)}&page=${p}&pageSize=${pageSize}`;
        const res = await fetch(url, { cache: "no-store" });
        // ถ้ากดเปลี่ยนหน้าเร็ว ๆ ให้เคารพเฉพาะ response ล่าสุด
        if (myId !== reqId.current) return;

        let j: ApiRes;
        try {
          j = (await res.json()) as ApiRes;
        } catch {
          throw new Error("รูปแบบข้อมูลไม่ถูกต้อง");
        }

        if (!res.ok || j.ok === false) {
          throw new Error(j?.error || "โหลดข้อมูลล้มเหลว");
        }

        setRows(Array.isArray(j.items) ? j.items : []);
        setPages(Math.max(1, Number(j.pages || 1)));
        setTotal(Number(j.total || 0));
        setPage(Number(j.page || p || 1));
      } catch (e: any) {
        setRows([]);
        setPages(1);
        setTotal(0);
        setErrorMsg(e?.message || "เกิดข้อผิดพลาดขณะโหลดข้อมูล");
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, q]
  );

  // แรกเข้า -> หน้า 1
  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // เปลี่ยนข้อมูลตาราง (ไม่มี filter ฝั่ง client ตอนนี้)
  const filtered = useMemo(() => rows, [rows]);

  async function createCustomer() {
    const nameEl = document.querySelector<HTMLInputElement>('input[name="quickName"]');
    const phoneEl = document.querySelector<HTMLInputElement>('input[name="quickPhone"]');
    const emailEl = document.querySelector<HTMLInputElement>('input[name="quickEmail"]');
    const tagsEl  = document.querySelector<HTMLInputElement>('input[name="quickTags"]');

    const name = (nameEl?.value ?? "").trim();
    const phone = (phoneEl?.value ?? "").trim();
    const email = (emailEl?.value ?? "").trim();
    const tags = (tagsEl?.value ?? "")
      .split(",").map(s => s.trim()).filter(Boolean);

    if (!name) {
      alert("กรุณากรอกชื่อ");
      return;
    }

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone: phone || null, email: email || null, tags }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.ok === false) {
        throw new Error(j?.error || "เพิ่มไม่สำเร็จ");
      }
      if (nameEl) nameEl.value = "";
      if (phoneEl) phoneEl.value = "";
      if (emailEl) emailEl.value = "";
      if (tagsEl) tagsEl.value = "";
      await load(1);
      alert("เพิ่มลูกค้าเรียบร้อย");
    } catch (e: any) {
      alert(e?.message || "เพิ่มไม่สำเร็จ");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">ลูกค้า (CRM เบา ๆ)</h1>
        <div className="flex gap-2">
          <input
            className="input w-[240px]"
            placeholder="ค้นหา ชื่อ/เบอร์/อีเมล"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") load(1); }}
          />
          <button className="btn" onClick={() => load(1)}>ค้นหา</button>
        </div>
      </div>

      {/* แถบแจ้ง error ถ้ามี */}
      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {errorMsg}
          <button className="btn ml-3" onClick={() => load(page)}>ลองใหม่</button>
        </div>
      )}

      {/* ฟอร์มเพิ่มลูกค้าแบบเร็ว */}
      <div className="card">
        <div className="card-body grid grid-cols-1 md:grid-cols-5 gap-3">
          <input name="quickName" className="input" placeholder="ชื่อลูกค้า *" />
          <input name="quickPhone" className="input" placeholder="โทรศัพท์" />
          <input name="quickEmail" className="input" placeholder="อีเมล" />
          <input name="quickTags" className="input" placeholder="แท็ก (คั่นด้วย , เช่น VIP,ขาประจำ)" />
          <button className="btn btn-primary" onClick={createCustomer} disabled={loading}>
            เพิ่มลูกค้า
          </button>
        </div>
      </div>

      {/* ตารางลูกค้า */}
      <div className="card">
        <div className="card-body overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-3 px-2">ชื่อลูกค้า</th>
                <th className="py-3 px-2">โทร</th>
                <th className="py-3 px-2">อีเมล</th>
                <th className="py-3 px-2">แท็ก</th>
                <th className="py-3 px-2">สร้างเมื่อ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="py-4 px-2" colSpan={5}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="py-4 px-2" colSpan={5}>ไม่พบข้อมูล</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="border-t">
                  <td className="py-2 px-2">{c.name}</td>
                  <td className="py-2 px-2">{c.phone ?? "-"}</td>
                  <td className="py-2 px-2">{c.email ?? "-"}</td>
                  <td className="py-2 px-2">
                    {c.tags?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {c.tags.map(t => (
                          <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : "-"}
                  </td>
                  <td className="py-2 px-2">
                    {new Date(c.createdAt).toLocaleDateString("th-TH")}
                  </td>
                </tr>
              ))}
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
                <span key={`dots-${i}`} className="px-2 text-slate-400">…</span>
              ) : (
                <button
                  key={`p-${n}`}
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
              onClick={() => load(Math.min(pages, page + 1))}
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
