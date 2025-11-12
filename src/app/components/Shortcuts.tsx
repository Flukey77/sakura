import Link from "next/link";
import type { ReactNode } from "react";

export type ShortcutItem = {
  title: string;
  href: string;
  icon?: ReactNode;   // รับไอคอนจาก lucide-react หรือ ReactNode ใดๆ
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
            <Link key={it.href + it.title} href={it.href} className="shortcut">
              <div className="shortcut-icon">
                <span className="[&>svg]:h-6 [&>svg]:w-6">{it.icon}</span>
              </div>

              <div className="min-w-0">
                <div className="shortcut-title">{it.title}</div>
                {it.desc && <div className="shortcut-desc mt-0.5 line-clamp-2">{it.desc}</div>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
