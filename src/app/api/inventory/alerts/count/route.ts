import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/inventory/alerts/count
 * คืนจำนวนสินค้าที่ "คงเหลือ <= safetyStock" (เฉพาะที่ตั้ง safetyStock > 0)
 * ใช้วิธีดึงเฉพาะฟิลด์ที่จำเป็นแล้วนับในฝั่งแอป เพื่อเลี่ยงการเทียบข้ามคอลัมน์ใน DB
 */
export async function GET() {
  try {
    const rows = await prisma.product.findMany({
      select: { stock: true, safetyStock: true },
    });

    const count = rows.reduce((n, p) => {
      const safety = Number(p.safetyStock ?? 0);
      const stock = Number(p.stock ?? 0);
      return safety > 0 && stock <= safety ? n + 1 : n;
    }, 0);

    return NextResponse.json({ ok: true, count });
  } catch (err: any) {
    console.error("GET /api/inventory/alerts/count error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Server error", count: 0 },
      { status: 500 }
    );
  }
}
