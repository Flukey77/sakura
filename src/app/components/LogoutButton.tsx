"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded-xl border px-3 py-2 bg-white hover:bg-slate-50"
      aria-label="ออกจากระบบ"
    >
      ออกจากระบบ
    </button>
  );
}
