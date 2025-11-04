"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Banner from "@/components/Banner";

export default function SignupPage() {
  const { status } = useSession();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);

  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [bannerType, setBannerType] = useState<"success" | "error" | "info">(
    "info"
  );

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBannerMsg(null);

    if (!username.trim() || !pass) {
      setBannerType("error");
      setBannerMsg("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password: pass }),
      });

      if (res.ok) {
        setBannerType("success");
        setBannerMsg("สมัครสมาชิกสำเร็จ");
        router.push("/login?registered=1");
      } else {
        const data = await res.json().catch(() => ({} as any));
        setBannerType("error");
        setBannerMsg(data?.message || "สมัครสมาชิกไม่สำเร็จ");
      }
    } catch {
      setBannerType("error");
      setBannerMsg("ไม่สามารถติดต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Banner type={bannerType} message={bannerMsg} />
      <div className="grid min-h-[70vh] place-items-center">
        <div className="w-full max-w-3xl rounded-2xl bg-white p-8 shadow-lg">
          <h1 className="mb-1 text-2xl font-semibold">สมัครสมาชิก</h1>
          <p className="mb-6 text-sm text-gray-500">อนุญาตเฉพาะโดเมนที่กำหนด</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm">Username</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="text-sm">Password</label>
              <input
                type="password"
                className="mt-1 w-full rounded border px-3 py-2"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <button
              disabled={loading}
              className="w-full rounded bg-[#1e66ff] py-2 text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
            </button>
          </form>

          <div className="mt-4 text-sm text-gray-600">
            มีบัญชีแล้ว?{" "}
            <Link href="/login" className="underline">
              เข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
