import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/inventory/alerts/count
 * นับจำนวนสินค้าที่ stock < safetyStock (เฉพาะ safetyStock > 0 และไม่ถูกลบ)
 */
export async function GET() {
  try {
    const rows = await prisma.product.findMany({
      where: { deletedAt: null },              // ข้ามตัวที่ถูกลบแบบ soft delete
      select: { stock: true, safetyStock: true },
    });

    const count = rows.reduce((n, p) => {
      const safety = Number(p.safetyStock ?? 0);
      const stock  = Number(p.stock ?? 0);
      return safety > 0 && stock < safety ? n + 1 : n; // ใช้ < ให้ตรงกับหน้า list
    }, 0);

    return NextResponse.json(
      { ok: true, count },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    console.error("GET /api/inventory/alerts/count error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Server error", count: 0 },
      { status: 500 }
    );
  }
}
