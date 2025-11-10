// src/app/components/Shortcuts.tsx
import Link from "next/link";
import type { ReactNode } from "react";

export type ShortcutItem = {
  title: string;
  href: string;
  icon?: ReactNode;   // <-- ใช้ ReactNode (ไอคอนจาก lucide-react)
  desc?: string;
};

export default function Shortcuts({
  items = [],
  title = "ทางลัดของคุณ (Your Shortcuts)",
}: {
  items?: ShortcutItem[];
  title?: string;
}) {
  if (!items.length) return null;

  return (
    <section className="card">
      <div className="card-body">
        <h3 className="font-semibold mb-4">{title}</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <Link
              key={it.href + it.title}
              href={it.href}
              className="group rounded-2xl border bg-white/80 px-6 py-5 transition
                         hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white
                         shadow-sm hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                {/* Icon bubble */}
                <div
                  className="shrink-0 inline-flex h-12 w-12 items-center justify-center
                             rounded-2xl bg-slate-100 text-slate-700
                             ring-1 ring-inset ring-slate-200
                             group-hover:bg-slate-900 group-hover:text-white
                             transition"
                >
                  {/* รองรับทั้ง React icon และ string เผื่อไว้ */}
                  <span className="[&>svg]:h-6 [&>svg]:w-6">{it.icon}</span>
                </div>

                <div className="min-w-0">
                  <div className="font-medium leading-6 text-slate-800">
                    {it.title}
                  </div>
                  {it.desc && (
                    <div className="text-sm text-slate-500 mt-0.5 line-clamp-2">
                      {it.desc}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

