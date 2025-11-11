// src/app/api/products/availability/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/products/availability?codes=A,B,C
 * -> [{ code, name, stock, safetyStock }]
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const codesParam = searchParams.get("codes") || "";
  const codes = codesParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!codes.length) {
    return NextResponse.json([], { status: 200 });
  }

  const rows = await prisma.product.findMany({
    where: { code: { in: codes } },
    select: { code: true, name: true, stock: true, safetyStock: true },
  });

  // คืนเฉพาะ code ที่ถามมา (รักษาลำดับ)
  const map = new Map(rows.map((r) => [r.code, r]));
  const result = codes.map((c) => {
    const r = map.get(c);
    return {
      code: c,
      name: r?.name ?? null,
      stock: r?.stock ?? 0,
      safetyStock: r?.safetyStock ?? 0,
    };
  });

  return NextResponse.json(result);
}
