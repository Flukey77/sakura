// src/app/api/customers/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/** GET /api/customers?q=&page=&pageSize= */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSizeRaw = Number(searchParams.get("pageSize") || 20);
    const pageSize = Math.min(Math.max(5, pageSizeRaw), 100); // 5–100

    let where: Prisma.CustomerWhereInput | undefined;
    if (q) {
      const mode: Prisma.QueryMode = "insensitive";
      where = {
        OR: [
          { name:    { contains: q, mode } },
          { phone:   { contains: q, mode } },
          { email:   { contains: q, mode } },
          { address: { contains: q, mode } },
          { tags: { has: q } }, // ค้นหาตรงใน array
        ],
      };
    }

    const total = await prisma.customer.count({ where });
    const pages = Math.max(1, Math.ceil(total / pageSize));

    const items = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        tags: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, items, page, pageSize, total, pages });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "server error" },
      { status: 500 }
    );
  }
}

/** POST /api/customers  body: { name, phone?, email?, address?, tags?: string[], note? } */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const name    = String(body?.name ?? "").trim();
    const phone   = body?.phone ? String(body.phone).trim() : null;
    const email   = body?.email ? String(body.email).trim() : null;
    const address = body?.address ? String(body.address).trim() : null;
    const tags: string[] = Array.isArray(body?.tags)
      ? body.tags.map((t: any) => String(t))
      : [];
    const note = body?.note ? String(body.note) : null;

    if (!name) {
      return NextResponse.json(
        { ok: false, error: "กรุณาระบุชื่อลูกค้า" },
        { status: 400 }
      );
    }

    const created = await prisma.customer.create({
      data: { name, phone, email, address, tags, note },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        tags: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, item: created }, { status: 201 });
  } catch (e: any) {
    const msg =
      e?.code === "P2002"
        ? "เบอร์โทรหรืออีเมลซ้ำในระบบ"
        : e?.message ?? "server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
