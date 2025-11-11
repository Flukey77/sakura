// src/app/api/products/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/** GET /api/products?q=&page=&pageSize= */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const q = (searchParams.get("q") || "").trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSizeRaw = Number(searchParams.get("pageSize") || 50);
  const pageSize = Math.min(Math.max(5, pageSizeRaw), 100);

  // ใช้ QueryMode ที่เป็นชนิดของ Prisma เท่านั้น (ห้าม string ธรรมดา)
  const mode: Prisma.QueryMode = "insensitive";

  const where: Prisma.ProductWhereInput | undefined = q
    ? {
        OR: [
          { code: { contains: q, mode } },
          { name: { contains: q, mode } },
        ],
      }
    : undefined;

  const total = await prisma.product.count({ where });
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const items = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      code: true,
      name: true,
      cost: true,
      price: true,
      stock: true,
      safetyStock: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    items,
    page,
    pageSize,
    total,
    pages,
  });
}

/** POST /api/products */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      code: string;
      name: string;
      cost: number | string;
      price: number | string;
      stock?: number;
    };

    const code = (body.code || "").trim();
    const name = (body.name || "").trim();
    if (!code || !name) {
      return NextResponse.json(
        { ok: false, message: "code/name required" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        code,
        name,
        cost: String(body.cost ?? 0),   // Decimal ใน Prisma: ส่งเป็น string ปลอดภัยสุด
        price: String(body.price ?? 0), // เช่น "0" หรือ "100.25"
        stock: Number(body.stock ?? 0),
      },
      select: {
        id: true,
        code: true,
        name: true,
        cost: true,
        price: true,
        stock: true,
        safetyStock: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, product }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "error" },
      { status: 500 }
    );
  }
}
