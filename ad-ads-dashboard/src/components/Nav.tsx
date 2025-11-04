"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function Nav() {
  const { data } = useSession();
  const sub = (data?.user as any)?.subscriptionStatus ?? "INACTIVE";

  return (
    <nav className="border-b bg-white/70 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-xl font-semibold">Ad Summary</Link>
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-black">Dashboard</Link>
          <Link href="/billing" className="text-sm text-gray-600 hover:text-black">Billing</Link>
        </div>
        <div className="flex items-center gap-4">
          {data?.user?.email && (
            <span className="text-sm text-gray-500 hidden sm:inline">
              {data.user.email} · <b>{sub}</b>
            </span>
          )}
          {data?.user ? (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded bg-black text-white text-sm px-3 py-1.5 hover:bg-gray-800"
            >
              Logout
            </button>
          ) : (
            <Link href="/login" className="rounded bg-black text-white text-sm px-3 py-1.5 hover:bg-gray-800">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
