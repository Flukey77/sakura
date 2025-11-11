// src/app/api/products/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/** GET /api/products?q=&page=&pageSize= */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSizeRaw = Number(searchParams.get("pageSize") || 20);
  const pageSize = Math.min(Math.max(5, pageSizeRaw), 100); // 5–100

  let where: Prisma.ProductWhereInput | undefined;
  if (q) {
    // 👈 สำคัญ: บังคับ type ให้เป็น Prisma.QueryMode
    const mode: Prisma.QueryMode = "insensitive";
    where = {
      OR: [
        { code: { contains: q, mode } },
        { name: { contains: q, mode } },
      ],
    };
  }

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

    if (!body.code || !body.name) {
      return NextResponse.json(
        { ok: false, message: "code/name required" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        code: body.code.trim(),
        name: body.name.trim(),
        cost: String(body.cost ?? 0),
        price: String(body.price ?? 0),
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
