import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/products?q=&page=&pageSize=
 * - ค้นหาด้วย code/name
 * - แบ่งหน้า
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSizeRaw = Number(searchParams.get("pageSize") || 20);
  const pageSize = Math.min(Math.max(5, pageSizeRaw), 100); // 5–100

  const where = q
    ? {
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
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

  return NextResponse.json({ ok: true, items, page, pageSize, total, pages });
}

/**
 * POST /api/products
 * body: { code, name, cost, price, stock? }
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      code: string;
      name: string;
      cost: number | string;
      price: number | string;
      stock?: number | string;
    };

    if (!body.code?.trim() || !body.name?.trim()) {
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

    return NextResponse.json({ ok: true, item: product }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "error" },
      { status: 500 }
    );
  }
}
