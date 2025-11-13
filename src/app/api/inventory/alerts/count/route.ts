import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ให้ Next.js ดึงสดทุกครั้ง
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // ดึงเฉพาะฟิลด์ที่จำเป็น
    const rows = await prisma.product.findMany({
      select: { stock: true, safetyStock: true },
    });

    // ใช้เกณฑ์เดียวกับหน้า alert: "ต่ำกว่า" (ไม่รวมเท่ากับ)
    const count = rows.reduce((n, p) => {
      const safety = Number(p.safetyStock ?? 0);
      const stock = Number(p.stock ?? 0);
      return safety > 0 && stock < safety ? n + 1 : n;
    }, 0);

    return NextResponse.json(
      { ok: true, count },
      {
        // กันแคชระหว่างทาง
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (err: any) {
    console.error("GET /api/inventory/alerts/count error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Server error", count: 0 },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
