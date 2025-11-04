"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPass] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setErr(null);

    // sanitize & validate เบื้องต้น
    const _name = name.trim();
    const _email = email.trim();
    const _password = password;

    if (_password.length < 8) {
      setErr("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name: _name, email: _email, password: _password }),
        headers: { "Content-Type": "application/json" },
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // เผื่อกรณี response ไม่ใช่ JSON
      }

      if (!res.ok) {
        setErr(data?.error || "สมัครไม่สำเร็จ");
        return;
      }

      // สมัครเสร็จ → ล็อกอินอัตโนมัติ
      const result = await signIn("credentials", {
        redirect: false, // จัดการ redirect เองเพื่อจับ error ได้
        email: _email,
        password: _password,
        callbackUrl: "/dashboard",
      });

      if (result?.error) {
        setErr("ล็อกอินไม่สำเร็จ: " + result.error);
        return;
      }

      router.push(result?.url || "/dashboard");
    } catch (e: any) {
      setErr("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center">
      <div className="w-full max-w-md rounded-xl bg-white shadow p-6">
        <h1 className="text-2xl font-semibold mb-1">สมัครสมาชิก</h1>
        <p className="text-sm text-gray-500 mb-6">อนุญาตเฉพาะโดเมนที่กำหนด</p>

        {err && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3 mb-4">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm">ชื่อ</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
          <div>
            <label className="text-sm">Email</label>
            <input
              type="email"
              className="mt-1 w-full border rounded px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-sm">Password</label>
            <input
              type="password"
              className="mt-1 w-full border rounded px-3 py-2"
              value={password}
              onChange={(e) => setPass(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <button
            disabled={loading}
            className="w-full rounded bg-black text-white py-2 hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
          </button>
        </form>

        <div className="text-sm text-gray-600 mt-4">
          มีบัญชีแล้ว? <Link className="underline" href="/login">เข้าสู่ระบบ</Link>
        </div>
      </div>
    </div>
  );
}
