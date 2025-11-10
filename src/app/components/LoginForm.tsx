// src/app/components/LoginForm.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/components/ToastProvider";

export default function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ username: "", password: "" });

  const canSubmit = form.username.trim() !== "" && form.password !== "" && !loading;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      toast.error("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
      return;
    }

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        username: form.username.trim(),
        password: form.password,
      });

      if (res?.ok) {
        // ไปที่ Dashboard แล้วให้ Dashboard แสดง toast จาก query
        router.replace("/dashboard?toast=login_ok");
        return;
      }

      // กรณีรหัสผิดหรือ provider คืน error
      toast.error(res?.error || "กรุณาตรวจสอบ Username / Password");
    } catch (err) {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 w-[360px]">
      <div>
        <label className="text-sm">Username</label>
        <input
          className="input"
          autoComplete="username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          disabled={loading}
        />
      </div>

      <div className="relative">
        <label className="text-sm">Password</label>
        <input
          type={show ? "text" : "password"}
          className="input pr-16"
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-8 text-xs text-slate-500"
          aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
          tabIndex={-1}
        >
          {show ? "ซ่อน" : "แสดง"}
        </button>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="btn btn-primary w-full disabled:opacity-60"
      >
        {loading ? "กำลังเข้าสู่ระบบ..." : "Login"}
      </button>
    </form>
  );
}

