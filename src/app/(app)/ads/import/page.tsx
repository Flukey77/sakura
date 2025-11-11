"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  date: string;         // yyyy-mm-dd
  channel: string;
  campaign?: string;
  adset?: string;
  clicks?: string;
  impressions?: string;
  cost: string;
};

type ApiRes = {
  ok: boolean;
  items: any[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  summary: { cost: number; clicks: number; impressions: number };
};

const CHANNELS = ["Facebook", "TikTok", "Shopee", "Lazada", "อื่นๆ"];

const fmt = (n: number) =>
  (n || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 });

export default function AdsImportPage() {
  const [rows, setRows] = useState<Row[]>([
    { date: new Date().toISOString().slice(0, 10), channel: "Facebook", cost: "0" },
  ]);
  const [busy, setBusy] = useState(false);

  // list
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<ApiRes | null>(null);
  const pageSize = 10;

  async function load(p = page) {
    const url = `/api/ads?q=${encodeURIComponent(q)}&page=${p}&pageSize=${pageSize}`;
    const r = await fetch(url, { cache: "no-store" });
    const j = (await r.json()) as ApiRes;
    setList(j);
    setPage(j.page);
  }
  useEffect(() => { load(1); /* first */ }, []);

  function addRow() {
    setRows((r) => [...r, { date: new Date().toISOString().slice(0, 10), channel: "Facebook", cost: "0" }]);
  }
  function rmRow(i: number) {
    setRows((r) => (r.length <= 1 ? r : r.filter((_, idx) => idx !== i)));
  }
  function patch(i: number, p: Partial<Row>) {
    setRows((r) => r.map((x, idx) => (idx === i ? { ...x, ...p } : x)));
  }

  async function saveAll() {
    setBusy(true);
    try {
      for (const r of rows) {
        const body = {
          date: r.date,
          channel: r.channel,
          campaign: r.campaign || undefined,
          adset: r.adset || undefined,
          clicks: r.clicks ? Number(r.clicks) : undefined,
          impressions: r.impressions ? Number(r.impressions) : undefined,
          cost: Number(r.cost || 0),
        };
        const res = await fetch("/api/ads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({} as any));
          throw new Error(j?.message || "บันทึกไม่สำเร็จ");
        }
      }
      setRows([{ date: new Date().toISOString().slice(0, 10), channel: "Facebook", cost: "0" }]);
      await load(1);
      alert("บันทึกค่าโฆษณาเรียบร้อย");
    } catch (e: any) {
      alert(e?.message ?? "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">นำเข้าค่าโฆษณา</h1>

      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-3">
            <div className="text-slate-700 font-medium">เพิ่มรายการ</div>
            <button className="btn" onClick={addRow}>+ เพิ่มแถว</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="py-2 pr-3 w-36">วันที่</th>
                  <th className="py-2 pr-3 w-32">ช่องทาง</th>
                  <th className="py-2 pr-3">แคมเปญ</th>
                  <th className="py-2 pr-3">Adset</th>
                  <th className="py-2 pr-3 w-24">คลิก</th>
                  <th className="py-2 pr-3 w-28">Impr.</th>
                  <th className="py-2 pr-3 w-28">ค่าใช้จ่าย</th>
                  <th className="py-2 pr-0 w-24 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-2 pr-3">
                      <input className="input" type="date" value={r.date}
                        onChange={(e) => patch(i, { date: e.target.value })}/>
                    </td>
                    <td className="py-2 pr-3">
                      <select className="input" value={r.channel}
                        onChange={(e) => patch(i, { channel: e.target.value })}>
                        {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <input className="input" value={r.campaign ?? ""} onChange={(e) => patch(i, { campaign: e.target.value })}/>
                    </td>
                    <td className="py-2 pr-3">
                      <input className="input" value={r.adset ?? ""} onChange={(e) => patch(i, { adset: e.target.value })}/>
                    </td>
                    <td className="py-2 pr-3">
                      <input className="input" inputMode="numeric" value={r.clicks ?? ""} onChange={(e) => patch(i, { clicks: e.target.value })}/>
                    </td>
                    <td className="py-2 pr-3">
                      <input className="input" inputMode="numeric" value={r.impressions ?? ""} onChange={(e) => patch(i, { impressions: e.target.value })}/>
                    </td>
                    <td className="py-2 pr-3">
                      <input className="input" inputMode="decimal" value={r.cost} onChange={(e) => patch(i, { cost: e.target.value })}/>
                    </td>
                    <td className="py-2 pr-0">
                      <div className="flex justify-end">
                        <button className="btn border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => rmRow(i)}>ลบ</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex justify-end">
              <button className="btn btn-primary" onClick={saveAll} disabled={busy}>
                {busy ? "กำลังบันทึก…" : "บันทึกทั้งหมด"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* รายการล่าสุด + สรุป */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-2">
            <div className="text-slate-700 font-medium">รายการล่าสุด</div>
            <div className="flex gap-2">
              <input className="input w-[220px]" placeholder="ค้นหา ช่องทาง/แคมเปญ"
                value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load(1)} />
              <button className="btn" onClick={() => load(1)}>ค้นหา</button>
            </div>
          </div>

          {!list ? (
            <div className="text-slate-400">กำลังโหลด…</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
                <Kpi title="ค่าใช้จ่ายรวม" value={`${fmt(list.summary.cost)} ฿`} />
                <Kpi title="คลิกรวม" value={fmt(list.summary.clicks)} />
                <Kpi title="Impressions" value={fmt(list.summary.impressions)} />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="py-2 pr-3 w-36">วันที่</th>
                      <th className="py-2 pr-3 w-28">ช่องทาง</th>
                      <th className="py-2 pr-3">แคมเปญ</th>
                      <th className="py-2 pr-3">Adset</th>
                      <th className="py-2 pr-3 w-24 text-right">คลิก</th>
                      <th className="py-2 pr-3 w-28 text-right">Impr.</th>
                      <th className="py-2 pr-3 w-28 text-right">ค่าใช้จ่าย</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.items.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="py-2 pr-3">{new Date(r.date).toLocaleDateString("th-TH")}</td>
                        <td className="py-2 pr-3">{r.channel}</td>
                        <td className="py-2 pr-3">{r.campaign ?? "-"}</td>
                        <td className="py-2 pr-3">{r.adset ?? "-"}</td>
                        <td className="py-2 pr-3 text-right">{fmt(Number(r.clicks || 0))}</td>
                        <td className="py-2 pr-3 text-right">{fmt(Number(r.impressions || 0))}</td>
                        <td className="py-2 pr-3 text-right">{fmt(Number(r.cost || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* pagination (ย่อ) */}
              <div className="mt-3 text-center text-sm text-slate-500">
                หน้า {list.page}/{list.pages} — รวม {fmt(list.total)} รายการ
              </div>
              <div className="mt-2 flex items-center justify-center gap-2">
                <button className="btn"
                  onClick={() => load(Math.max(1, page - 1))}
                  disabled={page <= 1}>«</button>
                <button className="btn"
                  onClick={() => load(Math.min(list.pages, page + 1))}
                  disabled={page >= (list.pages || 1)}>»</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="card">
      <div className="card-body flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl grid place-items-center ring-1 ring-slate-200 bg-white">
          <span aria-hidden>💸</span>
        </div>
        <div>
          <div className="text-slate-500 text-sm">{title}</div>
          <div className="text-2xl font-semibold">{value}</div>
        </div>
      </div>
    </div>
  );
}
