"use client";

import { useEffect, useMemo, useState } from "react";

type Customer = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  tags: string[];
  note?: string | null;
  createdAt: string;
};

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", tags: "" });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/customers?q=" + encodeURIComponent(q));
      const j = await res.json();
      setRows(j.items ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []); // แรกเข้า

  const filtered = useMemo(() => rows, [rows]);

  async function createCustomer() {
    if (!form.name.trim()) {
      alert("กรุณากรอกชื่อ");
      return;
    }
    const tags = form.tags
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        tags,
      }),
    });

    const j = await res.json();
    if (res.ok) {
      setForm({ name: "", phone: "", email: "", tags: "" });
      await load();
      alert("เพิ่มลูกค้าเรียบร้อย");
    } else {
      alert(j?.error || "เพิ่มไม่สำเร็จ");
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
            onKeyDown={e => e.key === "Enter" && load()}
          />
          <button className="btn" onClick={load}>ค้นหา</button>
        </div>
      </div>

      {/* ฟอร์มเพิ่มลูกค้าแบบเร็ว */}
      <div className="card">
        <div className="card-body grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            className="input"
            placeholder="ชื่อลูกค้า *"
            value={form.name}
            onChange={e => setForm(s => ({ ...s, name: e.target.value }))}
          />
          <input
            className="input"
            placeholder="โทรศัพท์"
            value={form.phone}
            onChange={e => setForm(s => ({ ...s, phone: e.target.value }))}
          />
          <input
            className="input"
            placeholder="อีเมล"
            value={form.email}
            onChange={e => setForm(s => ({ ...s, email: e.target.value }))}
          />
          <input
            className="input"
            placeholder="แท็ก (คั่นด้วย , เช่น VIP,ขาประจำ)"
            value={form.tags}
            onChange={e => setForm(s => ({ ...s, tags: e.target.value }))}
          />
          <button className="btn btn-primary" onClick={createCustomer}>เพิ่มลูกค้า</button>
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
                          <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{t}</span>
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
        </div>
      </div>
    </div>
  );
}

