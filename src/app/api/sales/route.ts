// src/app/api/sales/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { Decimal } from "@prisma/client/runtime/library";

/** ปัดเป็นทศนิยม 2 ตำแหน่งแบบปลอดภัย */
const r2 = (n: number | string | Decimal) =>
  Number(new Decimal(n || 0).toDecimalPlaces(2));

/** YYYY-MM-DD หรือ ISO -> Date (fallback เป็น now) */
function toDate(x?: string) {
  if (!x) return new Date();
  const d = new Date(x);
  return isNaN(d.getTime()) ? new Date() : d;
}

/** กรองแถวว่าง + แปลงตัวเลข */
function normalizeItems(raw: any[]) {
  return (raw || [])
    .filter(
      (it) =>
        (it?.code || it?.name) &&
        Number(it?.qty || 0) > 0 &&
        (Number(it?.price || 0) >= 0 || Number(it?.discount || 0) >= 0)
    )
    .map((it) => ({
      code: String(it.code || "").trim(),
      name: String(it.name || "").trim(),
      qty: Number(it.qty || 0),
      price: r2(it.price || 0),
      discount: r2(it.discount || 0),
    }));
}

/** ------------------------ POST: Create Sale ------------------------ */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ ok: false, message: "ไม่ได้ล็อกอิน" }, { status: 401 });
    }

    const body = await req.json();

    const docNo: string = String(body.docNo || "").trim();
    const docDate: Date = toDate(body.docDate);
    const channel: string | null = body.channel ?? null;

    // ---- ลูกค้า (หา/สร้าง แล้วส่งทั้ง customerId + customerName) ----
    const reqCust = body.customer || {};
    let customerId: string | null = null;
    let customerName: string | null = null;

    if (reqCust?.id) {
      // หากส่ง id มาโดยตรง
      const found = await prisma.customer.findUnique({ where: { id: String(reqCust.id) } });
      if (found) {
        customerId = found.id;
        customerName = found.name;
      }
    }

    if (!customerId) {
      const name = String(reqCust.name || "").trim();
      const phone = reqCust.phone ? String(reqCust.phone).trim() : undefined;
      const email = reqCust.email ? String(reqCust.email).trim() : undefined;

      if (name || phone || email) {
        const found = await prisma.customer.findFirst({
          where: {
            OR: [
              ...(phone ? [{ phone }] : []),
              ...(email ? [{ email }] : []),
              ...(name ? [{ name }] : []),
            ],
          },
        });

        if (found) {
          customerId = found.id;
          customerName = found.name;
        } else if (name) {
          const created = await prisma.customer.create({
            data: { name, phone, email, tags: [] },
          });
          customerId = created.id;
          customerName = created.name;
        }
      }
    }

    const items = normalizeItems(body.items || []);
    if (!items.length) {
      return NextResponse.json({ ok: false, message: "ไม่มีรายการสินค้า" }, { status: 400 });
    }

    // โหลดสินค้าในระบบ
    const codes = Array.from(new Set(items.map((x) => x.code)));
    const exist = await prisma.product.findMany({ where: { code: { in: codes } } });
    const pmap = new Map(exist.map((p) => [p.code, p]));

    // ถ้ายังไม่มีให้สร้างใหม่ (ชื่อเริ่มต้นเป็น code)
    const needCreate = codes.filter((c) => !pmap.has(c));
    if (needCreate.length) {
      const created = await prisma.$transaction(
        needCreate.map((code) =>
          prisma.product.create({
            data: { code, name: code, cost: new Decimal(0), price: new Decimal(0), stock: 0 },
          })
        )
      );
      for (const p of created) pmap.set(p.code, p);
    }

    // กันสต๊อกติดลบ
    for (const it of items) {
      const p = pmap.get(it.code)!;
      if (p.stock - it.qty < 0) {
        return NextResponse.json(
          { ok: false, message: `สต๊อกไม่พอสำหรับ ${it.code} (คงเหลือ ${p.stock}, ต้องการ ${it.qty})` },
          { status: 400 }
        );
      }
    }

    // คำนวณยอดรวม + เตรียม payload บรรทัด + COGS
    let totalBeforeVat = 0;

    const itemPayload = items.map((it) => {
      const lineAmount = r2(new Decimal(it.qty).mul(it.price).minus(it.discount));
      totalBeforeVat = r2(new Decimal(totalBeforeVat).plus(lineAmount));

      const p = pmap.get(it.code)!;
      const costEach = new Decimal(p.cost);
      const cogs = costEach.mul(it.qty);

      return {
        code: it.code,
        name: it.name || p.name,
        qty: it.qty,
        price: new Decimal(it.price),
        discount: new Decimal(it.discount),
        amount: new Decimal(lineAmount),
        costEach,
        cogs,
        productId: p.id,
      };
    });

    const vat = r2(new Decimal(totalBeforeVat).mul(0.07));
    const grand = r2(new Decimal(totalBeforeVat).plus(vat));

    const totalCogs = itemPayload.reduce(
      (sum, x) => Number(new Decimal(sum).plus(x.cogs)),
      0
    );

    // ธุรกรรม: สร้าง Sale + Items และหักสต๊อก
    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          docNo,
          docDate,
          date: docDate,
          channel,
          // เก็บทั้งชื่อ (string) และ customerId (FK) ถ้ามี
          customer: customerName || null,
          customerId: customerId || null,

          total: new Decimal(grand),
          totalCost: new Decimal(totalCogs),
          status: "NEW",

          createdBy: userId,
          items: {
            create: itemPayload.map((x) => ({
              productId: x.productId,
              qty: x.qty,
              price: x.price,
              discount: x.discount,
              amount: x.amount,
              costEach: x.costEach,
              cogs: x.cogs,
            })),
          },
        },
        include: { items: true },
      });

      // หักสต๊อก
      await Promise.all(
        itemPayload.map((x) =>
          tx.product.update({
            where: { id: x.productId },
            data: { stock: { decrement: x.qty } },
          })
        )
      );

      return created;
    });

    return NextResponse.json({
      ok: true,
      saleId: sale.id,
      totals: {
        totalBeforeVat,
        vat,
        grand,
        totalCogs,
        gross: r2(new Decimal(grand).minus(totalCogs)),
      },
    });
  } catch (err: any) {
    console.error("POST /api/sales error:", err);
    return NextResponse.json({ ok: false, message: err?.message ?? "Server error" }, { status: 500 });
  }
}

/** ------------------------ GET: List Sales ------------------------ */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const statusParam = (searchParams.get("status") || "ALL").toUpperCase();

  const baseWhere: any = {};
  if (from) baseWhere.date = { gte: new Date(from) };
  if (to) baseWhere.date = { ...(baseWhere.date || {}), lte: new Date(to + "T23:59:59.999Z") };

  const countersSeed = await prisma.sale.findMany({ where: baseWhere, select: { status: true } });
  const counters = { ALL: 0, NEW: 0, PENDING: 0, CONFIRMED: 0, CANCELLED: 0 };
  for (const s of countersSeed) {
    counters.ALL += 1;
    const k = (s.status || "NEW").toUpperCase() as keyof typeof counters;
    if (k in counters) counters[k] += 1;
  }

  const where: any = { ...baseWhere };
  if (statusParam !== "ALL") where.status = statusParam;

  const sales = await prisma.sale.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      items: true,
      user: { select: { id: true, username: true, name: true } },
      customerRef: { select: { id: true, name: true, phone: true, email: true } }, // << ดึงลูกค้ามาด้วย
    },
  });

  const summary = sales.reduce(
    (acc, s) => {
      const total = new Decimal(s.total || 0);
      const cogs =
        s.totalCost != null
          ? new Decimal(s.totalCost)
          : s.items.reduce((t, i) => t.plus(i.cogs), new Decimal(0));

      acc.count += 1;
      acc.total = r2(new Decimal(acc.total).plus(total));
      acc.cogs = r2(new Decimal(acc.cogs).plus(cogs));
      acc.gross = r2(new Decimal(acc.total).minus(acc.cogs));
      return acc;
    },
    { count: 0, total: 0, cogs: 0, gross: 0 }
  );

  return NextResponse.json({ ok: true, summary, counters, sales });
}

