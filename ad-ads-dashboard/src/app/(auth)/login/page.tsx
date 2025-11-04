'use client';

import { signIn, useSession } from 'next-auth/react';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Banner from '@/components/Banner';

// ✅ กัน Next พยายาม prerender หน้า login
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function mapNextAuthError(err?: string | null) {
  if (!err) return null;
  switch (err) {
    case 'CredentialsSignin':
      return 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
    case 'AccessDenied':
      return 'ไม่มีสิทธิ์เข้าถึงระบบ';
    default:
      return 'เกิดข้อผิดพลาดระหว่างเข้าสู่ระบบ';
  }
}

/** ใช้ useSearchParams แบบปลอดภัย (อยู่ใน Suspense) */
function SearchParamsBridge({
  setBannerType,
  setBannerMsg,
}: {
  setBannerType: (t: 'success' | 'error' | 'info') => void;
  setBannerMsg: (m: string | null) => void;
}) {
  const search = useSearchParams();

  useEffect(() => {
    const mapped = mapNextAuthError(search.get('error'));
    if (mapped) {
      setBannerType('error');
      setBannerMsg(mapped);
      return;
    }
    if (search.get('registered')) {
      setBannerType('success');
      setBannerMsg('สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ');
    }
  }, [search, setBannerType, setBannerMsg]);

  return null;
}

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPass] = useState('');
  const [loading, setLoading] = useState(false);

  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [bannerType, setBannerType] = useState<'success' | 'error' | 'info'>(
    'info'
  );

  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
  }, [status, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setBannerType('error');
      setBannerMsg('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }
    setLoading(true);
    try {
      const res = await signIn('credentials', {
        redirect: false,
        username: username.trim(),
        password,
        email: username.trim(),
        callbackUrl: '/dashboard',
      });
      if (res?.ok) {
        setBannerType('success');
        setBannerMsg('เข้าสู่ระบบสำเร็จ');
        router.push(res.url || '/dashboard');
      } else {
        setBannerType('error');
        setBannerMsg(
          mapNextAuthError(res?.error) || 'เข้าสู่ระบบไม่สำเร็จ'
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* ✅ ห่อ useSearchParams ด้วย Suspense */}
      <Suspense fallback={null}>
        <SearchParamsBridge
          setBannerType={setBannerType}
          setBannerMsg={setBannerMsg}
        />
      </Suspense>

      <Banner type={bannerType} message={bannerMsg} />

      <div className="grid min-h-[70vh] place-items-center">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-lg">
          <h1 className="mb-1 text-center text-2xl font-semibold">
            Sakura Biotech Co., Ltd. - Login
          </h1>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
                value={password}
                onChange={(e) => setPass(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <button
              disabled={loading}
              className="w-full rounded bg-[#1e66ff] py-2 text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'Login'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-600">
            ยังไม่มีบัญชี?{' '}
            <Link href="/signup" className="underline">
              Register ที่นี่
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
