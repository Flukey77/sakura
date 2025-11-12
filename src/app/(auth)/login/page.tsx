// src/app/(auth)/login/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoginForm from "@/app/components/LoginForm";
import { useToast } from "@/app/components/ToastProvider";

export const dynamic = "force-dynamic";

function LoginContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = sp.get("tab") || "login";
  const { toast } = useToast();

  useEffect(() => {
    let changed = false;

    if (sp.get("registered") === "1") {
      toast.success("สมัครสำเร็จแล้ว เข้าสู่ระบบได้เลย");
      changed = true;
    }
    if (sp.get("logout") === "1") {
      toast.info("ออกจากระบบเรียบร้อย");
      changed = true;
    }
    const err = sp.get("error");
    if (err) {
      try {
        toast.error(decodeURIComponent(err));
      } catch {
        toast.error(err);
      }
      changed = true;
    }

    if (changed) {
      const params = new URLSearchParams(sp.toString());
      params.delete("registered");
      params.delete("logout");
      params.delete("error");
      router.replace(params.toString() ? `/login?${params}` : "/login", {
        scroll: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  // ---------- REGISTER ----------
  const [reg, setReg] = useState({
    username: "",
    password: "",
    name: "",
    signupCode: "",
  });
  const [loading, setLoading] = useState(false);

  async function register() {
    if (!reg.username || !reg.password || !reg.signupCode) {
      toast.error("กรุณากรอก Username, Password และ SIGNUP CODE");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reg),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.ok) {
        router.replace("/login?registered=1");
        return;
      }
      toast.error(data?.error || "สมัครสมาชิกไม่สำเร็จ");
    } catch {
      toast.error("เชื่อมต่อไม่สำเร็จ โปรดลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  if (tab === "login") {
    return (
      <main className="p-0">
        <div className="card p-6 shadow-sm rounded-2xl">
          <h1 className="text-lg font-semibold text-center mb-6">
            Sakura Biotech Co., Ltd. — Login
          </h1>

          {/* LoginForm ของคุณ */}
          <LoginForm />

          <div className="mt-4 text-center text-sm text-slate-500">
            ไม่มีบัญชี{" "}
            <a href="/login?tab=register" className="text-blue-600 hover:underline">
              สมัครสมาชิกที่นี่
            </a>
          </div>
        </div>
      </main>
    );
  }

  // Register tab
  return (
    <main className="p-0">
      <div className="card p-6 shadow-sm rounded-2xl">
        <h2 className="text-lg font-semibold text-center mb-6">ลงทะเบียนพนักงาน</h2>

        <div className="space-y-1">
          <label className="text-sm text-slate-600">Username</label>
          <input
            className="input"
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            value={reg.username}
            onChange={(e) => setReg({ ...reg, username: e.target.value.trim() })}
            placeholder="ชื่อผู้ใช้บริษัท"
          />
        </div>

        <div className="space-y-1 mt-3">
          <label className="text-sm text-slate-600">Password</label>
          <input
            type="password"
            className="input"
            value={reg.password}
            onChange={(e) => setReg({ ...reg, password: e.target.value })}
            placeholder="รหัสผ่าน"
          />
        </div>

        <div className="space-y-1 mt-3">
          <label className="text-sm text-slate-600">ชื่อที่แสดง (ไม่บังคับ)</label>
          <input
            className="input"
            value={reg.name}
            onChange={(e) => setReg({ ...reg, name: e.target.value })}
            placeholder="เช่น สมชาย ใจดี"
          />
        </div>

        <div className="space-y-1 mt-3">
          <label className="text-sm text-slate-600">SIGNUP CODE</label>
          <input
            className="input"
            inputMode="text"
            autoCapitalize="characters"
            value={reg.signupCode}
            onChange={(e) => setReg({ ...reg, signupCode: e.target.value.trim() })}
            placeholder="รหัสบริษัท (เช่น SAKURA-ONLY)"
          />
        </div>

        <button onClick={register} disabled={loading} className="btn btn-primary w-full mt-5">
          {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
        </button>

        <p className="text-center text-sm mt-3 text-slate-500">
          มีบัญชีแล้ว{" "}
          <a href="/login" className="text-blue-600 hover:underline">
            เข้าสู่ระบบ
          </a>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-slate-400">กำลังโหลดแบบฟอร์ม…</div>}>
      <LoginContent />
    </Suspense>
  );
}
