// src/app/(app)/dashboard/page.tsx
"use client";

import { Suspense, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
} from "lucide-react";

export const dynamic = "force-dynamic";

function DashboardContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  // อ่าน toast จาก query แล้วล้างออก
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
    router.replace(params.toString() ? `${pathname}?${params}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp, pathname, router, toast]);

  const shortcutItems: ShortcutItem[] = useMemo(
    () => [
      { title: "รายงาน (Overview)", href: "/reports", icon: <BarChart3 />, desc: "ดูสรุปยอด, ROAS, กราฟรายวัน" },
      { title: "ดูรายการขาย", href: "/sales", icon: <ShoppingBag />, desc: "ค้นหา/กรองออเดอร์ทั้งหมด" },
      { title: "สร้างรายการขาย", href: "/sales/new", icon: <PlusCircle />, desc: "ออกบิล/ออเดอร์ใหม่" },
      { title: "ดูสินค้า (Products)", href: "/products", icon: <Boxes />, desc: "รายการสินค้า & สต๊อก" },
      { title: "คลังสินค้า/สาขา", href: "/products?tab=warehouses", icon: <Warehouse />, desc: "ดูสต๊อกตามคลัง/สาขา" },
      { title: "บริการขนส่ง", href: "/shipping", icon: <Truck />, desc: "ข้อมูลและจัดการการส่งของ" },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">ภาพรวม</h1>
      {/* ลบข้อความ “ช่วงข้อมูล: …” ออกแล้ว */}

      {/* การ์ดสถิติ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-icon"><CircleDollarSign className="h-6 w-6" /></div>
          <div>
            <div className="text-slate-500 text-sm">ยอดขายวันนี้</div>
            <div className="text-lg font-semibold">0.00</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><Package2 className="h-6 w-6" /></div>
          <div>
            <div className="text-slate-500 text-sm">ออเดอร์วันนี้</div>
            <div className="text-lg font-semibold">0</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><PiggyBank className="h-6 w-6" /></div>
          <div>
            <div className="text-slate-500 text-sm">กำไรวันนี้</div>
            <div className="text-lg font-semibold">0.00</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><Users2 className="h-6 w-6" /></div>
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
    <Suspense fallback={<div className="text-slate-400">กำลังโหลดแดชบอร์ด…</div>}>
      <DashboardContent />
    </Suspense>
  );
}
