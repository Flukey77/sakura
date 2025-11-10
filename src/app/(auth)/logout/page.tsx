// src/app/(auth)/logout/page.tsx
"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

export const dynamic = "force-dynamic";

export default function LogoutPage() {
  useEffect(() => {
    signOut({ callbackUrl: "/login?logout=1" });
  }, []);
  return (
    <div className="min-h-screen grid place-items-center text-slate-500">
      กำลังออกจากระบบ...
    </div>
  );
}
