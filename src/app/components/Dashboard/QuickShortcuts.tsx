"use client";

import Link from "next/link";
import {
  LineChart, Store, PlusSquare, Package, Warehouse, Truck
} from "lucide-react";

type Item = {
  href: string;
  title: string;
  icon: React.ComponentType<any>;
};

const items: Item[] = [
  { href: "/reports",       title: "รายงาน (Overview)", icon: LineChart },
  { href: "/sales",         title: "ดูรายการขาย",        icon: Store },
  { href: "/sales/new",     title: "สร้างรายการขาย",      icon: PlusSquare },
  { href: "/products",      title: "ดูสินค้า (Products)", icon: Package },
  { href: "/warehouses",    title: "คลังสินค้า/สาขา",     icon: Warehouse },
  { href: "/shipping",      title: "ศูนย์บริการขนส่ง",     icon: Truck },
];

export default function QuickShortcuts() {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold">ทางลัดของคุณ (Your Shortcuts)</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {items.map(({ href, title, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-2xl border bg-white p-4 text-center shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 transition group-hover:bg-indigo-50 group-hover:text-indigo-600">
              <Icon className="h-8 w-8" />
            </div>
            <div className="line-clamp-2 text-sm font-medium text-slate-700">{title}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

