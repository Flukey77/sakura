// ตัวอย่าง: src/app/api/dashboard/summary/route.ts
import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  noStore(); // กัน Next cache

  // ดึงรายการมาแล้วนับใน JS เพื่อเทียบ field ต่อ field
  const rows = await prisma.product.findMany({
    where: { deletedAt: null }, // ถ้ามี soft delete
    select: { id: true, stock: true, safetyStock: true },
  });

  // นิยาม “ใกล้หมด” = stock < safetyStock (ไม่ใช่ <=)
  const lowCount = rows.filter(
    r => (r.stock ?? 0) < (r.safetyStock ?? 0)
  ).length;

  return NextResponse.json({ lowCount });
}
