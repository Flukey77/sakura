import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 🔧 แปลง id ที่มาจาก URL (string) → number ให้ตรงกับ schema (Int)
  const productId = Number(params.id);
  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  try {
    // ถ้าตั้ง onDelete: Cascade ที่ SaleItem.product แล้ว จะลบได้เลย
    await prisma.product.delete({ where: { id: productId } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2003") {
      // ยังติด FK → แปลว่ายังไม่ได้ cascade ครบ
      return NextResponse.json(
        { error: "ลบไม่ได้เพราะยังมีข้อมูลที่อ้างถึงสินค้าอยู่ (foreign key). ตรวจสอบ onDelete: Cascade ใน schema.prisma" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: e?.message ?? "delete failed" }, { status: 500 });
  }
}
