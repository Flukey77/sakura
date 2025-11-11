import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PATCH /api/products/:id – อัปเดต cost/price/stock (ADMIN เท่านั้น) */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const idNum = Number(params.id);
  if (!Number.isInteger(idNum)) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({} as any));
  const data: any = {};

  if (body.cost !== undefined) {
    const n = Number(body.cost);
    if (Number.isNaN(n) || n < 0) return NextResponse.json({ error: "Invalid cost" }, { status: 400 });
    data.cost = n;
  }
  if (body.price !== undefined) {
    const n = Number(body.price);
    if (Number.isNaN(n) || n < 0) return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    data.price = n;
  }
  if (body.stock !== undefined) {
    const n = Number(body.stock);
    if (!Number.isInteger(n) || n < 0) return NextResponse.json({ error: "Invalid stock" }, { status: 400 });
    data.stock = n;
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  const updated = await prisma.product.update({
    where: { id: idNum },
    data,
    select: { id: true, code: true, name: true, cost: true, price: true, stock: true },
  });

  return NextResponse.json({ ok: true, product: updated });
}

/** DELETE (ของคุณเดิม) */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const productId = Number(params.id);
  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  try {
    await prisma.product.delete({ where: { id: productId } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2003") {
      return NextResponse.json(
        { error: "ลบไม่ได้เพราะยังมีข้อมูลที่อ้างถึงสินค้าอยู่ (foreign key). ตรวจสอบ onDelete: Cascade ใน schema.prisma" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: e?.message ?? "delete failed" }, { status: 500 });
  }
}
