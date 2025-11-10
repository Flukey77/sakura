"use client";

import React, { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";

type Role = "ADMIN" | "EMPLOYEE";

type UserRow = {
  id: string;
  username: string;
  name: string | null;
  role: Role;
  createdAt: string; // ISO string จาก API
};

const fetcher = async (url: string): Promise<UserRow[]> => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("โหลดรายชื่อผู้ใช้ไม่สำเร็จ");
  const j = await res.json();
  // API /api/admin/users คืนเป็น array ตรง ๆ
  return Array.isArray(j) ? (j as UserRow[]) : ((j?.users as UserRow[]) ?? []);
};

export default function AdminUsersPage() {
  const { data: session } = useSession();
  // แคสต์แบบหลวมเพื่อหลีกเลี่ยง TS error กรณี object user ไม่ได้ประกาศ type
  const selfId: string | null = ((session?.user as any)?.id as string) ?? null;

  const { data, isLoading, mutate, error, isValidating } = useSWR<UserRow[]>(
    "/api/admin/users",
    fetcher,
    { fallbackData: [], revalidateOnFocus: true }
  );

  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    username: string;
    password: string;
    name: string;
    role: Role;
  }>({ username: "", password: "", name: "", role: "EMPLOYEE" });

  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  async function createUser() {
    const username = form.username.trim();
    const password = form.password;
    if (!username || !password) {
      alert("กรอก username/password");
      return;
    }
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, username }),
    });
    const j = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) {
      alert(j?.error || "เพิ่มผู้ใช้ไม่สำเร็จ");
      return;
    }
    setForm({ username: "", password: "", name: "", role: "EMPLOYEE" });
    usernameRef.current?.focus();
    mutate();
  }

  async function updateRole(id: string, role: Role) {
    if (!confirm(`เปลี่ยนสิทธิ์ผู้ใช้เป็น ${role}?`)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as any;
        alert(j?.error || "อัปเดตสิทธิ์ไม่สำเร็จ");
      } else {
        mutate();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function removeUser(id: string) {
    if (selfId && id === selfId) {
      alert("ไม่สามารถลบผู้ใช้ของตัวเองได้");
      return;
    }
    if (!confirm("ต้องการลบผู้ใช้นี้จริงหรือไม่?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const j = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) alert(j?.error || "ลบไม่สำเร็จ");
      else mutate();
    } finally {
      setBusyId(null);
    }
  }

  function onFormKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) {
    if (e.key === "Enter") createUser();
  }

  const rows: UserRow[] = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">จัดการผู้ใช้</h1>
        <div className="flex-1" />
        <button
          className="btn btn-secondary"
          onClick={() => mutate()}
          disabled={isValidating}
        >
          {isValidating ? "กำลังรีเฟรช…" : "รีเฟรช"}
        </button>
      </div>

      {/* ฟอร์มเพิ่มผู้ใช้ */}
      <div className="card p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input
          ref={usernameRef}
          className="input"
          placeholder="Username"
          value={form.username}
          onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
          onKeyDown={onFormKeyDown}
        />
        <input
          className="input"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
          onKeyDown={onFormKeyDown}
        />
        <input
          className="input"
          placeholder="ชื่อ (ไม่บังคับ)"
          value={form.name}
          onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          onKeyDown={onFormKeyDown}
        />
        <select
          className="select"
          value={form.role}
          onChange={(e) => setForm((s) => ({ ...s, role: e.target.value as Role }))}
          onKeyDown={onFormKeyDown}
        >
          <option value="EMPLOYEE">EMPLOYEE</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <button className="btn btn-primary" onClick={createUser}>
          เพิ่มผู้ใช้
        </button>
      </div>

      {/* ตารางผู้ใช้ */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="th">Username</th>
              <th className="th">ชื่อ</th>
              <th className="th">สิทธิ์</th>
              <th className="th">สร้างเมื่อ</th>
              <th className="th text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td className="td py-6 text-center text-red-600" colSpan={5}>
                  {(error as Error).message || "เกิดข้อผิดพลาดในการโหลดข้อมูล"}
                </td>
              </tr>
            )}

            {isLoading && !rows.length && (
              <tr>
                <td className="td py-6 text-center" colSpan={5}>
                  กำลังโหลด...
                </td>
              </tr>
            )}

            {rows.map((u) => {
              const isSelf = !!selfId && u.id === selfId;
              return (
                <tr key={u.id} className="border-b">
                  <td className="td">{u.username}</td>
                  <td className="td">{u.name ?? "-"}</td>
                  <td className="td">
                    <select
                      className="select w-[160px]"
                      value={u.role}
                      disabled={busyId === u.id || isSelf}
                      onChange={(e) => updateRole(u.id, e.target.value as Role)}
                    >
                      <option value="EMPLOYEE">EMPLOYEE</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                    {isSelf && (
                      <span className="ml-2 text-xs text-slate-500">(คุณ)</span>
                    )}
                  </td>
                  <td className="td">
                    {new Date(u.createdAt).toLocaleString("th-TH")}
                  </td>
                  <td className="td text-right">
                    <button
                      className="btn text-red-600 border-red-200 hover:bg-red-50"
                      disabled={busyId === u.id || isSelf}
                      onClick={() => removeUser(u.id)}
                      title={isSelf ? "ห้ามลบผู้ใช้ของตัวเอง" : "ลบผู้ใช้"}
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              );
            })}

            {!isLoading && !error && rows.length === 0 && (
              <tr>
                <td className="td py-6 text-center" colSpan={5}>
                  ไม่พบผู้ใช้
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

