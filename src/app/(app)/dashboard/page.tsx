// src/app/(app)/dashboard/page.tsx
"use client";

import { Suspense, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Shortcuts, { type ShortcutItem } from "@/app/components/Shortcuts";
import { useToast } from "@/app/components/ToastProvider";

import {
  BarChart3,
  ShoppingBag,
  PlusCircle,
  Boxes,
  Warehouse,
  Truck,
  CircleDollarSign,
  Package2,
  PiggyBank,
  Users2,
  ShieldCheck,
} from "lucide-react";

// บังคับดึงข้อมูลสด
export const dynamic = "force-dynamic";

const fetcher = async (url: string) => {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("fetch failed");
  return r.json();
};

function DashboardContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  // ----- แสดง toast จาก query แล้วล้างออกทันที (กันยิงซ้ำ) -----
  useEffect(() => {
    const t = sp.get("toast");
    if (!t) return;

    switch (t) {
      case "login_ok":
        toast.success("ล็อกอินสำเร็จ!");
        break;
      case "registered":
        toast.success("สมัครสมาชิกสำเร็จ!");
        break;
      case "logout_ok":
        toast.info("ออกจากระบบแล้ว");
        break;
      case "no_permission":
        toast.error("คุณไม่มีสิทธิ์เข้าหน้านี้");
        break;
    }

    const params = new URLSearchParams(sp.toString());
    params.delete("toast");
    router.replace(params.toString() ? `${pathname}?${params}` : pathname, {
      scroll: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp, pathname, router]);

  // ----- จำนวนสินค้าใกล้หมด -----
  const { data: alerts, error } = useSWR<{ ok: boolean; count: number }>(
    "/api/inventory/alerts/count",
    fetcher,
    {
      // รีเฟรชถี่ขึ้น และ revalidate ตอนโฟกัสหน้าจอ
      refreshInterval: 10_000,
      revalidateOnFocus: true,
      revalidateIfStale: true,
      keepPreviousData: true,
      fallbackData: { ok: true, count: 0 },
    }
  );
  const lowStockCount = Number(alerts?.count ?? 0);

  // ----- สิทธิ์ผู้ใช้ (อาจยังไม่โหลดในเฟรมแรกได้) -----
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as "ADMIN" | "EMPLOYEE" | undefined;

  // ----- ชอร์ตคัต -----
  const shortcutItems: ShortcutItem[] = useMemo(() => {
    const base: ShortcutItem[] = [
      {
        title: "รายงาน (Overview)",
        href: "/reports",
        icon: <BarChart3 />,
        desc: "ดูสรุปยอด, ROAS, กราฟรายวัน",
      },
      {
        title: "ดูรายการขาย",
        href: "/sales",
        icon: <ShoppingBag />,
        desc: "ค้นหา/กรองออเดอร์ทั้งหมด",
      },
      {
        title: "สร้างรายการขาย",
        href: "/sales/new",
        icon: <PlusCircle />,
        desc: "ออกบิล/ออเดอร์ใหม่",
      },
      {
        title: "ดูสินค้า (Products)",
        href: "/products",
        icon: <Boxes />,
        desc: "รายการสินค้า & สต๊อก",
      },
      {
        title: "คลังสินค้า/สาขา",
        href: "/products?tab=warehouses",
        icon: <Warehouse />,
        desc: "ดูสต๊อกตามคลัง/สาขา",
      },
      {
        title: "บริการขนส่ง",
        href: "/shipping",
        icon: <Truck />,
        desc: "ข้อมูลและจัดการการส่งของ",
      },
    ];

    if (role === "ADMIN") {
      base.push({
        title: "จัดการผู้ใช้ (Admin)",
        href: "/admin/users",
        icon: <ShieldCheck />,
        desc: "เพิ่ม/ลบ/ปรับสิทธิ์ผู้ใช้งาน",
      });
    }
    return base;
  }, [role]);

  return (
    <div className="space-y-6">
      {/* หัวข้อ + จุดแดงเมื่อมีสินค้าใกล้หมด */}
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">ภาพรวม</h1>
        {lowStockCount > 0 && <span className="notif-dot" title="มีสินค้าใกล้หมด" />}
      </div>

      {/* การ์ดแจ้งเตือนสินค้าใกล้หมด */}
      {lowStockCount > 0 && (
        <div className="card p-4 sm:p-5 flex items-start gap-3 border-amber-300/60 bg-amber-50">
          <span className="notif-dot mt-1.5" />
          <div className="min-w-0">
            <div className="font-medium text-slate-800">
              สินค้าใกล้หมด {lowStockCount.toLocaleString()} รายการ
            </div>
            <div className="text-sm text-slate-600">
              สต๊อกต่ำกว่า Safety Stock — ตรวจสอบและวางแผนสั่งซื้อเพิ่ม
            </div>
          </div>
          <div className="ml-auto shrink-0">
            <Link href="/inventory/alerts" className="btn btn-dark">
              ไปยังการแจ้งเตือน
            </Link>
          </div>
        </div>
      )}

      {/* ถ้า API count error ให้โชว์ banner เบา ๆ เพื่อสังเกตได้ */}
      {error && (
        <div className="card p-3 border-rose-200 bg-rose-50 text-rose-700">
          โหลดจำนวนการแจ้งเตือนสต๊อกไม่สำเร็จ
        </div>
      )}

      {/* การ์ดสถิติ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-icon">
            <CircleDollarSign className="h-6 w-6" />
          </div>
          <div>
            <div className="text-slate-500 text-sm">ยอดขายวันนี้</div>
            <div className="text-lg font-semibold">0.00</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Package2 className="h-6 w-6" />
          </div>
          <div>
            <div className="text-slate-500 text-sm">ออเดอร์วันนี้</div>
            <div className="text-lg font-semibold">0</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <PiggyBank className="h-6 w-6" />
          </div>
          <div>
            <div className="text-slate-500 text-sm">กำไรวันนี้</div>
            <div className="text-lg font-semibold">0.00</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Users2 className="h-6 w-6" />
          </div>
          <div>
            <div className="text-slate-500 text-sm">ลูกค้าใหม่</div>
            <div className="text-lg font-semibold">0</div>
          </div>
        </div>
      </div>

      <Shortcuts items={shortcutItems} title="ทางลัดของคุณ (Your Shortcuts)" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="center-block text-slate-400">กำลังโหลดแดชบอร์ด…</div>}>
      <DashboardContent />
    </Suspense>
  );
}
