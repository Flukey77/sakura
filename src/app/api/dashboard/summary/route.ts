// src/app/api/dashboard/summary/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // ช่วงวันนี้
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    // ตัวอย่างสรุป: นับออเดอร์วันนี้ / ลูกค้าใหม่วันนี้
    const [ordersToday, newCustomers] = await Promise.all([
      prisma.sale.count({ where: { createdAt: { gte: start, lt: end } } }),
      prisma.customer.count({ where: { createdAt: { gte: start, lt: end } } }),
    ]);

    // ดึงสินค้า แล้วคำนวณ low stock ใน JS (ไม่อิง deletedAt)
    const rows = await prisma.product.findMany({
      select: { id: true, stock: true, safetyStock: true },
    });

    const lowStockCount = rows.reduce((acc, p) => {
      const stock = (p as any).stock ?? 0;
      const safety = (p as any).safetyStock ?? 0;
      return acc + (stock < safety ? 1 : 0);
    }, 0);

    return NextResponse.json({
      ok: true,
      summary: { ordersToday, newCustomers, lowStockCount },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "failed" },
      { status: 500 }
    );
  }
}
