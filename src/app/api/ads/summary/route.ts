import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AdChannel } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** แปลง yyyy-mm-dd -> Date (ตัดเวลาให้เป็น 00:00:00) */
function toDateOnly(s?: string | null) {
  if (!s) return undefined as any;
  const d = new Date(s);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** GET /api/ads/summary?from=&to=
 *  ตอบ: { ok, totalCost, byChannel: { FACEBOOK, TIKTOK } }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = toDateOnly(searchParams.get("from"));
    const toInput = toDateOnly(searchParams.get("to"));

    const where: any = {};
    if (from) where.date = { ...(where.date || {}), gte: from };
    if (toInput) {
      const t = new Date(toInput);
      t.setHours(23, 59, 59, 999);
      where.date = { ...(where.date || {}), lte: t };
    }

    // รวมทั้งหมด
    const total = await prisma.adSpendDaily.aggregate({
      _sum: { amount: true },
      where,
    });

    // รวมแต่ละช่องทาง (ใช้ aggregate แยก เพื่อเลี่ยง groupBy edge-case)
    const fb = await prisma.adSpendDaily.aggregate({
      _sum: { amount: true },
      where: { ...where, channel: AdChannel.FACEBOOK },
    });
    const tt = await prisma.adSpendDaily.aggregate({
      _sum: { amount: true },
      where: { ...where, channel: AdChannel.TIKTOK },
    });

    return NextResponse.json({
      ok: true,
      totalCost: Number(total._sum.amount || 0),
      byChannel: {
        FACEBOOK: Number(fb._sum.amount || 0),
        TIKTOK: Number(tt._sum.amount || 0),
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "error" },
      { status: 500 }
    );
  }
}
