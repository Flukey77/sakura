// src/app/api/sales/restore/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/sales/restore
 * body: { idOrDocNo: string }
 * - ADMIN เท่านั้น
 * - ตอน restore จะ "หักสต็อกกลับ" เพราะตอนลบเราเคยคืนสต็อกไปแล้ว
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role as string | undefined;
    const userId = (session?.user as any)?.id as string | undefined;

    if (!userId) return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });
    if (role !== "ADMIN") {
      return NextResponse.json({ ok: false, message: "forbidden: admin only" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const idOrDocNo = String(body?.idOrDocNo || "").trim();
    if (!idOrDocNo) {
      return NextResponse.json({ ok: false, message: "missing idOrDocNo" }, { status: 400 });
    }

    const target = await prisma.sale.findFirst({
      where: { OR: [{ id: idOrDocNo }, { docNo: idOrDocNo }] },
      include: { items: { select: { productId: true, qty: true } } },
    });
    if (!target) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
    if (!target.deletedAt) {
      return NextResponse.json({ ok: false, message: "not deleted" }, { status: 400 });
    }

    // เช็ค stock พอก่อนหักกลับ
    const prodIds = [...new Set(target.items.map(i => i.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: prodIds } },
      select: { id: true, stock: true, code: true },
    });
    const pmap = new Map(products.map(p => [p.id, p]));
    for (const it of target.items) {
      const p = pmap.get(it.productId);
      if (!p) continue;
      if ((p.stock ?? 0) - it.qty < 0) {
        return NextResponse.json(
          { ok: false, message: `สต๊อกไม่พอสำหรับกู้คืน (สินค้า ${p.code} คงเหลือ ${p.stock}, ต้องการ ${it.qty})` },
          { status: 400 }
        );
      }
    }

    const restored = await prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id: target.id },
        data: { deletedAt: null, deletedBy: null },
      });
      // หักสต๊อกกลับ
      for (const it of target.items) {
        await tx.product.update({
          where: { id: it.productId },
          data: { stock: { decrement: it.qty } },
        });
      }
      return tx.sale.findUnique({
        where: { id: target.id },
        select: { id: true, docNo: true, deletedAt: true },
      });
    });

    return NextResponse.json({ ok: true, sale: restored });
  } catch (err: any) {
    console.error("POST /api/sales/restore error:", err);
    return NextResponse.json({ ok: false, message: err?.message ?? "Server error" }, { status: 500 });
  }
}
