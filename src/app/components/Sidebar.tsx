// src/app/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import React, { useMemo } from "react";

type Item = { href: string; label: string; emoji: string };

function NavItem({ href, label, emoji, active }: Item & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      title={label}
      className={`sidebar-link flex items-center gap-2 ${active ? "active" : ""}`}
    >
      <span aria-hidden className="text-base leading-none">{emoji}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { data } = useSession();
  const role = (data?.user as any)?.role as "ADMIN" | "EMPLOYEE" | undefined;

  // เมนูหลัก
  const main: Item[] = [
    { href: "/dashboard", label: "ภาพรวม",           emoji: "🏠" },
    { href: "/sales",     label: "รายการขาย",        emoji: "🧾" },
    { href: "/products",  label: "คลังสินค้า/สาขา",  emoji: "🗃️" },
    { href: "/shipping",  label: "บริการขนส่ง",      emoji: "🚚" },
    { href: "/reports",   label: "รายงาน",           emoji: "📈" },
  ];

  // การดำเนินงาน / ยูทิลิตี้
  const ops: Item[] = [
    { href: "/inventory/alerts", label: "แจ้งเตือนสต๊อก", emoji: "🚨" },
    { href: "/customers",        label: "ลูกค้า",          emoji: "🧑‍🤝‍🧑" },
    { href: "/ads/import",       label: "นำเข้าค่าโฆษณา", emoji: "📥" },
  ];

  // Admin only
  const admin: Item[] = [{ href: "/admin/users", label: "จัดการผู้ใช้", emoji: "👥" }];

  const isActive = useMemo(
    () => (href: string) => pathname === href || pathname.startsWith(href + "/"),
    [pathname]
  );

  return (
    <aside className="w-[240px] shrink-0 px-3 py-4 border-r bg-white">
      <div className="mb-4 px-2 text-lg font-semibold">Sakura</div>

      {/* Main */}
      <div className="space-y-1">
        {main.map((it) => (
          <NavItem key={it.href} {...it} active={isActive(it.href)} />
        ))}
      </div>

      {/* Ops / Utilities */}
      <div className="mt-6 mb-2 px-2 text-xs uppercase text-slate-500">
        การดำเนินงาน
      </div>
      <div className="space-y-1">
        {ops.map((it) => (
          <NavItem key={it.href} {...it} active={isActive(it.href)} />
        ))}
      </div>

      {/* Admin */}
      {role === "ADMIN" && (
        <>
          <div className="mt-6 mb-2 px-2 text-xs uppercase text-slate-500">
            Admin
          </div>
          <div className="space-y-1">
            {admin.map((it) => (
              <NavItem key={it.href} {...it} active={isActive(it.href)} />
            ))}
          </div>
        </>
      )}
    </aside>
  );
}

