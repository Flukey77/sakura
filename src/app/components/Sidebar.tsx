"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import React, { useMemo } from "react";
import useSWR from "swr";

type Item = { href: string; label: string; emoji: string };

function NavItem({
  href,
  label,
  emoji,
  active,
  showDot,
}: Item & { active: boolean; showDot?: boolean }) {
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

      {/* จุดแดงกระพริบอยู่ด้านขวาสุดเมื่อมีการแจ้งเตือน */}
      {showDot && <span className="ml-auto notif-dot" aria-label="มีการแจ้งเตือน" />}
    </Link>
  );
}

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then(async (r) => {
    const j = await r.json();
    if (!r.ok) throw new Error(j?.message || "โหลดข้อมูลไม่สำเร็จ");
    return j;
  });

export default function Sidebar() {
  const pathname = usePathname();
  const { data } = useSession();
  const role = (data?.user as any)?.role as "ADMIN" | "EMPLOYEE" | undefined;

  // ดึงจำนวนสินค้าใกล้หมด เพื่อนำไปแสดงจุดแดงที่เมนูแจ้งเตือนสต๊อก
  const { data: alerts } = useSWR<{ ok: boolean; count: number }>(
    "/api/inventory/alerts/count",
    fetcher,
    {
      refreshInterval: 60_000,
      revalidateOnFocus: true,
      fallbackData: { ok: true, count: 0 },
    }
  );
  const alertCount = Number(alerts?.count ?? 0);
  const hasLowStock = alertCount > 0;

  const main: Item[] = [
    { href: "/dashboard", label: "ภาพรวม",           emoji: "🏠" },
    { href: "/sales",     label: "รายการขาย",        emoji: "🧾" },
    { href: "/products",  label: "คลังสินค้า/สาขา",  emoji: "🗃️" },
    { href: "/shipping",  label: "บริการขนส่ง",      emoji: "🚚" },
    { href: "/reports",   label: "รายงาน",           emoji: "📈" },
    { href: "/ads",       label: "ภาพรวมโฆษณา",      emoji: "📣" },
  ];

  const ops: Item[] = [
    { href: "/inventory/alerts", label: "แจ้งเตือนสต๊อก", emoji: "🚨" },
    { href: "/customers",        label: "ลูกค้า",          emoji: "🧑‍🤝‍🧑" },
    { href: "/ads/import",       label: "นำเข้าค่าโฆษณา", emoji: "📥" },
  ];

  const admin: Item[] = [{ href: "/admin/users", label: "จัดการผู้ใช้", emoji: "👥" }];

  const isActive = useMemo(
    () => (href: string) => pathname === href || pathname.startsWith(href + "/"),
    [pathname]
  );

  return (
    <div className="h-full px-3 py-4 border-r bg-white">
      <div className="mb-4 px-2 text-lg font-semibold">Sakura</div>

      <div className="space-y-1">
        {main.map((it) => (
          <NavItem key={it.href} {...it} active={isActive(it.href)} />
        ))}
      </div>

      <div className="mt-6 mb-2 px-2 text-xs uppercase text-slate-500">การดำเนินงาน</div>
      <div className="space-y-1">
        {ops.map((it) => (
          <NavItem
            key={it.href}
            {...it}
            active={isActive(it.href)}
            /* โชว์จุดแดงเฉพาะเมนูแจ้งเตือนสต๊อกและมีของใกล้หมดจริง */
            showDot={it.href === "/inventory/alerts" ? hasLowStock : false}
          />
        ))}
      </div>

      {role === "ADMIN" && (
        <>
          <div className="mt-6 mb-2 px-2 text-xs uppercase text-slate-500">Admin</div>
          <div className="space-y-1">
            {admin.map((it) => (
              <NavItem key={it.href} {...it} active={isActive(it.href)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
