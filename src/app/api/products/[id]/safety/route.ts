// src/app/api/products/[id]/safety/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PATCH /api/products/:id/safety
 * body: { safetyStock: number }  // จำนวนเต็ม ไม่ติดลบ
 * เฉพาะ ADMIN
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // auth
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if ((session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // validate id
  const productId = Number(params.id);
  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  // read body & validate
  const body = await req.json().catch(() => ({} as any));
  const n = Number(body?.safetyStock);
  if (!Number.isInteger(n) || n < 0) {
    return NextResponse.json({ error: "Invalid safetyStock" }, { status: 400 });
  }

  // update
  const product = await prisma.product.update({
    where: { id: productId },
    data: { safetyStock: n },
    select: { id: true, code: true, name: true, stock: true, safetyStock: true },
  });

  return NextResponse.json({ ok: true, product });
}
