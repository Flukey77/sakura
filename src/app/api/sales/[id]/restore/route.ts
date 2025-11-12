// src/app/api/sales/restore/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

/**
 * POST /api/sales/restore
 * body: { idOrDocNo: string }
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role as string | undefined;
    if (role !== "ADMIN") {
      return NextResponse.json({ ok: false, message: "forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const idOrDocNo = String(body?.idOrDocNo || "").trim();
    if (!idOrDocNo) {
      return NextResponse.json({ ok: false, message: "missing idOrDocNo" }, { status: 400 });
    }

    const target = await prisma.sale.findFirst({
      where: { OR: [{ id: idOrDocNo }, { docNo: idOrDocNo }] },
      select: { id: true, deletedAt: true },
    });
    if (!target) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
    if (!target.deletedAt) {
      return NextResponse.json({ ok: true, message: "not deleted" });
    }

    await prisma.sale.update({
      where: { id: target.id },
      data: { deletedAt: null, deletedBy: null },
      select: { id: true },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("POST /api/sales/restore error:", err);
    return NextResponse.json({ ok: false, message: err?.message ?? "restore failed" }, { status: 500 });
  }
}
