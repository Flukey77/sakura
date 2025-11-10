"use client";

import { useState } from "react";

export default function AdsImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (!file) { setMsg("กรุณาเลือกไฟล์ CSV"); return; }

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/ads/import", { method: "POST", body: form });
    const j = await res.json().catch(()=>({ ok:false, message:"เกิดข้อผิดพลาด" }));
    if (res.ok) setMsg(`นำเข้าสำเร็จ: ${j.imported} แถว`);
    else setMsg(j.message || "นำเข้าไม่สำเร็จ");
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">นำเข้าค่าโฆษณา (CSV)</h1>

      <div className="rounded-2xl border bg-white p-4">
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e)=>setFile(e.target.files?.[0] ?? null)}
          />
          <div className="text-sm text-slate-500">
            รูปแบบคอลัมน์: <code>date,channel,campaign,adset,amount</code><br/>
            ตัวอย่าง channel: <code>Facebook</code> หรือ <code>TikTok</code>
          </div>
          <button className="rounded-xl bg-blue-600 text-white px-4 py-2" type="submit">
            อัปโหลด
          </button>
        </form>
        {msg && <div className="mt-3 text-sm">{msg}</div>}
      </div>
    </div>
  );
}

