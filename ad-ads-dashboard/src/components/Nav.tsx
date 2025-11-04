"use client";

import Link from "next/link";
import { useSession, signOut, signIn } from "next-auth/react";

export default function Nav() {
  const { status } = useSession();

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-gray-900 text-white font-semibold">
            S
          </div>
          <span className="text-lg font-semibold">Sakura</span>
        </Link>

        {status === "authenticated" ? (
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm text-gray-700 hover:text-black">
              ภาพรวม
            </Link>
            <Link href="/products" className="text-sm text-gray-700 hover:text-black">
              สินค้า
            </Link>
            <Link href="/sales" className="text-sm text-gray-700 hover:text-black">
              รายการขาย
            </Link>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              ออกจากระบบ
            </button>
          </nav>
        ) : (
          <button
            onClick={() => signIn(undefined, { callbackUrl: "/dashboard" })}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            เข้าสู่ระบบ
          </button>
        )}
      </div>
    </header>
  );
}
