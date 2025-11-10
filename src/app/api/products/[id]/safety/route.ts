import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { safetyStock } = await req.json();

    const val = Number(safetyStock ?? 0);
    if (!Number.isInteger(val) || val < 0) {
      return NextResponse.json(
        { ok: false, message: "ค่าไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const productId = Number(params.id);
    if (!Number.isInteger(productId)) {
      return NextResponse.json(
        { ok: false, message: "รหัสสินค้าไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const p = await prisma.product.update({
      where: { id: productId },
      data: { safetyStock: val },
      select: { id: true, code: true, stock: true, safetyStock: true },
    });

    return NextResponse.json({ ok: true, product: p });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
