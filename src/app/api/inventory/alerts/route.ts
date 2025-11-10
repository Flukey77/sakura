// src/app/api/inventory/alerts/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// API ให้เป็น dynamic เสมอ
export const dynamic = "force-dynamic";
// ถ้าต้องการ: บังคับ runtime เป็น Node (เพราะใช้ Prisma)
// export const runtime = "nodejs";

type Row = {
  id: number;
  code: string;
  name: string;
  stock: number | null;
  safetyStock: number | null;
};

// ตรวจจับอาการ DB ต่อไม่ได้ (เช่น PGBouncer/เครือข่าย)
function dbDown(e: any) {
  const msg = String(e?.message || "");
  return e?.code === "P1001" || msg.includes("Can't reach database server");
}

export async function GET() {
  try {
    let rows: Row[] = [];

    try {
      // ทางหลัก: raw SQL เพื่อคิวรีแบบเปรียบเทียบคอลัมน์ได้
      rows = await prisma.$queryRaw<Row[]>`
        SELECT id, code, name, stock, "safetyStock"
        FROM "Product"
        WHERE stock < "safetyStock"
        ORDER BY stock ASC
      `;
    } catch (errRaw: any) {
      // ถ้าฐานข้อมูลล่ม/ต่อไม่ติด → ส่งเปล่ากลับไป (อย่าให้หน้าแตก)
      if (dbDown(errRaw)) {
        return NextResponse.json({ ok: true, items: [], note: "db_unreachable" });
      }

      // ไม่ใช่อาการ DB down → ลอง fallback ใช้ ORM
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
