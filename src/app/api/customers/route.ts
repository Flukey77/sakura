// src/app/api/customers/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/** GET /api/customers?q=... */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  // บอกชนิดชัดเจนให้ TS
  let where: Prisma.CustomerWhereInput | undefined;

  if (q) {
    const mode: Prisma.QueryMode = "insensitive";
    where = {
      OR: [
        { name:  { contains: q, mode } },
        { phone: { contains: q, mode } },
        { email: { contains: q, mode } },
      ],
    };
  }

  const items = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ ok: true, items });
}

/** POST /api/customers  body: { name, phone?, email?, tags?: string[], note? } */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const name = String(body?.name ?? "").trim();
    const phone = body?.phone ? String(body.phone).trim() : null;
    const email = body?.email ? String(body.email).trim() : null;
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
      data: { name, phone, email, tags, note },
    });

    return NextResponse.json({ ok: true, item: created }, { status: 201 });
  } catch (e: any) {
    // จัดการเคส unique ซ้ำ (เช่น phone/email)
    const msg =
      e?.code === "P2002"
        ? "เบอร์โทรหรืออีเมลซ้ำในระบบ"
        : e?.message ?? "server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
