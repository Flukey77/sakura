import Link from "next/link";
import { cn } from "@/lib/cn";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-semibold">Sakura</Link>
          <nav className="flex gap-4 text-sm text-gray-600">
            <Link href="/dashboard" className="hover:text-black">ภาพรวม</Link>
            <Link href="/products" className="hover:text-black">สินค้า</Link>
            <Link href="/sales" className="hover:text-black">รายการขาย</Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
