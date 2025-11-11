// src/app/api/customers/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";                 // ✅ ใช้ default export ให้ตรงกับไฟล์อื่น ๆ
import { Prisma } from "@prisma/client";

/** GET /api/customers?q=&page=&pageSize=
 *  - ค้นหาจาก name/phone/email (case-insensitive)
 *  - แบ่งหน้า: page เริ่มที่ 1, pageSize เริ่มที่ 20
 *  - คืน shape: { ok, items, page, pageSize, total, pages }
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const q = (searchParams.get("q") || "").trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || 20)));
  const skip = (page - 1) * pageSize;

  // สร้าง where แบบปลอดภัยกับ TS
  const mode: Prisma.QueryMode = "insensitive";
  let where: Prisma.CustomerWhereInput | undefined = undefined;

  if (q) {
    where = {
      OR: [
        { name:  { contains: q, mode } },
        { phone: { contains: q, mode } },
        { email: { contains: q, mode } },
      ],
    };
  }

  // นับทั้งหมดก่อน
  const total = await prisma.customer.count({ where });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pages); // กันกรณี page เกินหน้า
  const safeSkip = (safePage - 1) * pageSize;

  // ดึงรายการตามหน้า
  const items = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: safeSkip,
    take: pageSize,
    // คืน address และฟิลด์หลักที่ UI ใช้
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      tags: true,
      note: true,
      address: true,       // ✅ แอดเดรสที่เพิ่งเพิ่มในสคีมา
      createdAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    items,
    page: safePage,
    pageSize,
    total,
    pages,
  });
}

/** POST /api/customers
 * body: { name, phone?, email?, tags?: string[], note?, address? }
 */
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
    const address = body?.address ? String(body.address) : null;

    if (!name) {
      return NextResponse.json(
        { ok: false, error: "กรุณาระบุชื่อลูกค้า" },
        { status: 400 }
      );
    }

    const created = await prisma.customer.create({
      data: { name, phone, email, tags, note, address },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        tags: true,
        note: true,
        address: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, item: created }, { status: 201 });
  } catch (e: any) {
    // จัดการ unique constraint
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { ok: false, error: "เบอร์โทรหรืออีเมลซ้ำในระบบ" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { ok: false, error: e?.message ?? "server error" },
      { status: 500 }
    );
  }
}
