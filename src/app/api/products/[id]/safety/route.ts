import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PATCH /api/products/:id/safety  body: { safetyStock:number } */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const idNum = Number(params.id);
    if (!Number.isInteger(idNum)) {
      return NextResponse.json({ ok: false, error: "Invalid product id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({} as any));
    const n = Number(body?.safetyStock);
    if (!Number.isInteger(n) || n < 0) {
      return NextResponse.json({ ok: false, error: "safetyStock must be non-negative integer" }, { status: 400 });
    }

    const product = await prisma.product.update({
      where: { id: idNum },
      data: { safetyStock: n },
      select: { id: true, code: true, name: true, safetyStock: true },
    });

    return NextResponse.json({ ok: true, product });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "update failed" }, { status: 500 });
  }
}
