// src/app/api/sales/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const nextStatus = String(body?.status || "").toUpperCase();

    const ALLOW = new Set(["NEW", "PENDING", "CONFIRMED", "CANCELLED"]);
    if (!ALLOW.has(nextStatus as any)) {
      return NextResponse.json({ ok: false, message: "invalid status" }, { status: 400 });
    }

    const sale = await prisma.sale.update({
      where: { id: params.id },
      data: { status: nextStatus },
      select: { id: true, status: true },
    });

    return NextResponse.json({ ok: true, sale });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || "update failed" }, { status: 500 });
  }
}
