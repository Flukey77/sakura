"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

function mapNextAuthError(err?: string | null) {
  if (!err) return null;
  switch (err) {
    case "CredentialsSignin":
      return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
    case "AccessDenied":
      return "ไม่มีสิทธิ์เข้าถึงระบบ";
    case "CallbackRouteError":
    case "OAuthAccountNotLinked":
    case "OAuthSignin":
    case "OAuthCallback":
      return "เกิดข้อผิดพลาดระหว่างเข้าสู่ระบบ";
    default:
      return err; // เผื่อข้อความ custom จากเซิร์ฟเวอร์
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const search = useSearchParams();
  const router = useRouter();
  const { status } = useSession();

  // ถ้าล็อกอินอยู่แล้ว ให้พาเข้า dashboard
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  const errorFromCallback = useMemo(
    () => mapNextAuthError(search.get("error")),
    [search]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setMsg(null);

    const _email = email.trim();
    const _password = password;

    if (!_email || !_password) {
      setMsg("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        redirect: false, // ให้เราควบคุมการนำทางเอง
        email: _email,
        password: _password,
        callbackUrl: "/dashboard",
      });

      if (res?.ok) {
        // ใช้ URL จาก NextAuth ถ้ามี
        router.push(res.url || "/dashboard");
      } else {
        setMsg(mapNextAuthError(res?.error) || "เข้าสู่ระบบไม่สำเร็จ");
      }
    } catch {
      setMsg("ไม่สามารถติดต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center">
      <div className="w-full max-w-md rounded-xl bg-white shadow p-6">
        <h1 className="text-2xl font-semibold mb-1">เข้าสู่ระบบ</h1>
        <p className="text-sm text-gray-500 mb-6">ระบบสรุปกำไรจากการยิงแอด</p>

        {(msg || errorFromCallback) && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3 mb-4">
            {msg || errorFromCallback}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-sm">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPass(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
              required
              autoComplete="current-password"
            />
          </div>
          <button
            disabled={loading}
            className="w-full rounded bg-black text-white py-2 hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <div className="text-sm text-gray-600 mt-4">
          ยังไม่มีบัญชี? <Link className="underline" href="/signup">สมัครสมาชิก</Link>
        </div>
      </div>
    </div>
  );
}
