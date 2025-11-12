// src/app/api/sales/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function r2(v: unknown) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

async function fetchSale(idOrDocNo: string) {
  // ไม่ใส่ select scalar เพื่อให้ Prisma คืนทุก scalar field (รวม deletedAt/deletedBy)
  return prisma.sale.findFirst({
    where: { OR: [{ id: idOrDocNo }, { docNo: idOrDocNo }] },
    include: {
      user: { select: { id: true, username: true, name: true } },
      customerRef: {
        select: { id: true, name: true, phone: true, email: true, address: true },
      },
      items: {
        include: { product: { select: { id: true, code: true, name: true } } },
        orderBy: { id: "asc" },
      },
    },
  });
}

/* ========= GET /api/sales/[idOrDocNo] ========= */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const idOrDoc = decodeURIComponent(params?.id ?? "");
    if (!idOrDoc) {
      return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
    }

    const sale = await fetchSale(idOrDoc);
    if (!sale) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }

    const items = sale.items.map((it) => ({
      id: it.id,
      code: it.product?.code ?? "",
      name: it.product?.name ?? "",
      qty: Number(it.qty ?? 0),
      price: r2(it.price),
      discount: r2(it.discount),
      amount: r2(it.amount),
      cogs: r2(it.cogs),
    }));

    const total = r2(sale.total);
    const totalCogs =
      sale.totalCost != null ? r2(sale.totalCost) : items.reduce((t, i) => t + r2(i.cogs), 0);
    const subtotal = items.reduce((t, i) => t + r2(i.amount), 0);
    const vat = r2(total - subtotal);
    const gross = r2(total - totalCogs);

    return NextResponse.json({
      ok: true,
      sale: {
        id: sale.id,
        docNo: sale.docNo,
        docDate: sale.docDate,
        date: sale.date,
        status: sale.status,
        channel: sale.channel,
        deletedAt: sale.deletedAt ?? null,
        createdBy: sale.user?.name || sale.user?.username || null,
        customer: sale.customer ?? sale.customerRef?.name ?? null,
        customerInfo: {
          name: sale.customerRef?.name ?? sale.customer ?? "",
          phone: sale.customerRef?.phone ?? "",
          email: sale.customerRef?.email ?? "",
          address: sale.customerRef?.address ?? "",
        },
        items,
        summary: { subtotal, vat, total, totalCogs, gross },
      },
    });
  } catch (err: any) {
    console.error("GET /api/sales/[id] error:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Server error" }, { status: 500 });
  }
}

/* ========= PATCH /api/sales/[idOrDocNo] (เปลี่ยนสถานะ) ========= */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const idOrDoc = decodeURIComponent(params?.id ?? "");
    if (!idOrDoc) {
      return NextResponse.json({ ok: false, message: "missing id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const nextStatus = String(body?.status || "").toUpperCase();

    const ALLOW = new Set(["NEW", "PENDING", "CONFIRMED", "CANCELLED"]);
    if (!ALLOW.has(nextStatus)) {
      return NextResponse.json({ ok: false, message: "invalid status" }, { status: 400 });
    }

    const target = await prisma.sale.findFirst({
      where: { OR: [{ id: idOrDoc }, { docNo: idOrDoc }] },
      select: { id: true, deletedAt: true },
    });
    if (!target) {
      return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
    }
    if (target.deletedAt) {
      return NextResponse.json({ ok: false, message: "เอกสารถูกลบแล้ว" }, { status: 400 });
    }

    const sale = await prisma.sale.update({
      where: { id: target.id },
      data: { status: nextStatus },
      select: { id: true, docNo: true, status: true },
    });

    return NextResponse.json({ ok: true, sale });
  } catch (err: any) {
    console.error("PATCH /api/sales/[id] error:", err);
    return NextResponse.json({ ok: false, message: err?.message ?? "update failed" }, { status: 500 });
  }
}

/* ========= DELETE /api/sales/[idOrDocNo] (Soft delete) ========= */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role as string | undefined;
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId || role !== "ADMIN") {
      return NextResponse.json({ ok: false, message: "forbidden" }, { status: 403 });
    }

    const idOrDoc = decodeURIComponent(params?.id ?? "");
    if (!idOrDoc) {
      return NextResponse.json({ ok: false, message: "missing id" }, { status: 400 });
    }

    const target = await prisma.sale.findFirst({
      where: { OR: [{ id: idOrDoc }, { docNo: idOrDoc }] },
      select: { id: true, deletedAt: true },
    });
    if (!target) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
    if (target.deletedAt) {
      return NextResponse.json({ ok: true, message: "already deleted" });
    }

    await prisma.sale.update({
      where: { id: target.id },
      data: { deletedAt: new Date(), deletedBy: userId },
      select: { id: true },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/sales/[id] error:", err);
    return NextResponse.json({ ok: false, message: err?.message ?? "delete failed" }, { status: 500 });
  }
}
