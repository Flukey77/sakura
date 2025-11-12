// src/app/api/sales/restore/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/sales/restore
 * body: { idOrDocNo: string, force?: boolean }
 * - ADMIN เท่านั้น
 * - ปกติจะเช็คสต็อกก่อน; ถ้าไม่พอจะคืน 400 พร้อม code: "INSUFFICIENT_STOCK"
 * - ถ้า force = true จะหักสต็อกแม้ติดลบ (กู้คืนทุกกรณี)
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
    const force = Boolean(body?.force);

    if (!idOrDocNo) {
      return NextResponse.json({ ok: false, message: "missing idOrDocNo" }, { status: 400 });
    }

    const target = await prisma.sale.findFirst({
      where: { OR: [{ id: idOrDocNo }, { docNo: idOrDocNo }] },
      include: {
        items: { select: { productId: true, qty: true, id: true } },
      },
    });
    if (!target) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
    if (!target.deletedAt) {
      return NextResponse.json({ ok: false, message: "not deleted" }, { status: 400 });
    }

    // เช็คสต็อกก่อน (ถ้าไม่ force)
    if (!force) {
      const prodIds = [...new Set(target.items.map(i => i.productId))];
      const products = await prisma.product.findMany({
        where: { id: { in: prodIds } },
        select: { id: true, stock: true, code: true, name: true },
      });
      const pmap = new Map(products.map(p => [p.id, p]));
      const problems = target.items
        .map((it) => {
          const p = pmap.get(it.productId);
          if (!p) return null;
          const remain = p.stock ?? 0;
          return remain - it.qty < 0
            ? { productId: p.id, code: p.code, name: p.name, remain, need: it.qty }
            : null;
        })
        .filter(Boolean) as { productId: number; code: string; name: string; remain: number; need: number }[];

      if (problems.length) {
        return NextResponse.json(
          { ok: false, code: "INSUFFICIENT_STOCK", message: "สต็อกไม่พอสำหรับกู้คืน", problems },
          { status: 400 }
        );
      }
    }

    const restored = await prisma.$transaction(async (tx) => {
      // เอาเครื่องหมายลบออก
      await tx.sale.update({
        where: { id: target.id },
        data: { deletedAt: null, deletedBy: null },
      });

      // หักสต็อกกลับ (อาจติดลบถ้า force)
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
