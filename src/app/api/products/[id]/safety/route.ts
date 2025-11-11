// src/app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * GET /api/products?q=&page=&pageSize=
 * - ค้นหา code/name แบบ case-insensitive
 * - แบ่งหน้า
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSizeRaw = Number(searchParams.get("pageSize") || 20);
    const pageSize = Math.min(Math.max(5, pageSizeRaw), 100); // 5–100

    // << สำคัญ: ใช้ QueryMode ที่เป็น literal ให้ type ถูกต้อง
    const where: Prisma.ProductWhereInput | undefined = q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
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
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * body: { code, name, cost, price, stock? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      code: string;
      name: string;
      cost: number | string;
      price: number | string;
      stock?: number;
    };

    if (!body?.code?.trim() || !body?.name?.trim()) {
      return NextResponse.json(
        { ok: false, error: "code/name required" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        code: body.code.trim(),
        name: body.name.trim(),
        // Prisma Decimal รับ string ได้ปลอดภัยกว่า
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
    const msg =
      e?.code === "P2002"
        ? "รหัสสินค้าซ้ำ (code ต้องไม่ซ้ำ)"
        : e?.message ?? "error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
