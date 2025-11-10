// src/app/api/inventory/alerts/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = false;
// (ถ้าต้องการ: บังคับ runtime เป็น Node)
// export const runtime = "nodejs";

type Row = {
  id: number;
  code: string;
  name: string;
  stock: number | null;
  safetyStock: number | null;
};

// ตรวจจับอาการ DB ล่ม/ต่อไม่ติด
function dbDown(e: any) {
  const msg = String(e?.message || "");
  return e?.code === "P1001" || msg.includes("Can't reach database server");
}

export async function GET() {
  // กันโดนเรียกระหว่าง build/export
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return NextResponse.json({ ok: true, items: [] });
  }

  try {
    let rows: Row[] = [];

    try {
      // ทางเลือกหลัก: raw SQL (เปรียบเทียบคอลัมน์ได้)
      rows = await prisma.$queryRaw<Row[]>`
        SELECT id, code, name, stock, "safetyStock"
        FROM "Product"
        WHERE stock < "safetyStock"
        ORDER BY stock ASC
      `;
    } catch (errRaw: any) {
      // ถ้าฐานข้อมูลล่ม/ต่อไม่ติด → ส่งเปล่ากลับไป (อย่าทำให้หน้าแตก)
      if (dbDown(errRaw)) {
        return NextResponse.json({ ok: true, items: [], note: "db_unreachable" });
      }
      // ไม่ใช่อาการ DB down → ลอง fallback ORM
      const all = await prisma.product.findMany({
        select: { id: true, code: true, name: true, stock: true, safetyStock: true },
      });
      rows = all
        .filter((p) => (p.stock ?? 0) < (p.safetyStock ?? 0))
        .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
    }

    const items = rows.map((p) => {
      const stock = Number(p.stock ?? 0);
      const safetyStock = Number(p.safetyStock ?? 0);
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        stock,
        safetyStock,
        needToOrder: Math.max(1, safetyStock - stock),
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    if (dbDown(e)) {
      return NextResponse.json({ ok: true, items: [], note: "db_unreachable" });
    }
    console.error("GET /api/inventory/alerts error:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "server error" }, { status: 500 });
  }
}
