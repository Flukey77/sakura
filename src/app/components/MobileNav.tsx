"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const items = [
  { href: "/dashboard", label: "ภาพรวม", emoji: "🏠" },
  { href: "/sales",     label: "ขาย",   emoji: "🧾" },
  { href: "/products",  label: "คลัง",  emoji: "📦" },
  { href: "/reports",   label: "รายงาน", emoji: "📈" },
];

export function MobileTopBar() {
  const pathname = usePathname();
  const notHome = pathname !== "/dashboard";

  // โชว์เฉพาะจอเล็ก
  return (
    <div className="md:hidden sticky top-0 z-50 bg-white/90 backdrop-blur border-b">
      <div className="flex items-center gap-3 px-3 h-12">
        {notHome ? (
          <Link
            href="/dashboard"
            className="rounded-xl px-3 py-1.5 border text-sm bg-white"
            aria-label="กลับหน้าหลัก"
            title="กลับหน้าหลัก"
          >
            ← กลับ
          </Link>
        ) : (
          <div className="px-1" />
        )}
        <div className="font-medium">Sakura</div>
        <div className="ml-auto" />
      </div>
    </div>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t bg-white">
      <ul className="grid grid-cols-4">
        {items.map((it) => {
          const active =
            pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={`flex flex-col items-center justify-center py-2 text-xs ${
                  active ? "text-slate-900 font-medium" : "text-slate-500"
                }`}
                aria-current={active ? "page" : undefined}
                title={it.label}
              >
                <span aria-hidden className="text-base leading-none">
                  {it.emoji}
                </span>
                <span className="mt-0.5">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
