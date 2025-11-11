import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { Prisma } from "@prisma/client";

/** -------- Decimal helpers -------- */
const D = Prisma.Decimal;
const r2 = (x: number | string | Prisma.Decimal) =>
  Number(new D(x ?? 0).toDecimalPlaces(2));

/** สร้าง date แบบ “ตัดเวลา” ตามโซนเครื่อง */
function dateOnlyLocal(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** YYYY-MM-DD หรือ dd/mm/yyyy (รองรับปี พ.ศ.) -> Date (ถ้าไม่ถูก ให้ today) */
function toDateThaiAware(x?: string): Date {
  if (!x) return dateOnlyLocal();

  // รูปแบบจาก <input type="date">
  if (/^\d{4}-\d{2}-\d{2}$/.test(x)) {
    const [y, m, d] = x.split("-").map((n) => parseInt(n, 10));
    return new Date(y, m - 1, d); // local, date-only
  }

  // รูปแบบ dd/mm/yyyy (เช่น 11/11/2568)
  const m = String(x).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const dd = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10) - 1;
    let yy = parseInt(m[3], 10);
    if (yy > 2200) yy -= 543; // พ.ศ. -> ค.ศ.
    return new Date(yy, mm, dd);
  }

  // fallback parse
  const d = new Date(x);
  if (!isNaN(d.getTime())) return dateOnlyLocal(d);
  return dateOnlyLocal();
}

/** กันข้อมูลปี พ.ศ. เผลอหลุดเข้ามา */
function normalizeChristianYear(d: Date) {
  let y = d.getFullYear();
  if (y > 2200) return new Date(y - 543, d.getMonth(), d.getDate());
  return dateOnlyLocal(d);
}

/** รวม: parse -> normalize -> date-only (ค.ศ.) */
function ensureDocDate(x?: string) {
  return normalizeChristianYear(toDateThaiAware(x));
}

/** แปลงเป็นเลขเอกสาร SO-พศMMDDNNN (ใช้ปี พ.ศ. เฉพาะในเลขเอกสาร) */
function buildDocNo_BE(d: Date, seq: number) {
  const yyyyBE = d.getFullYear() + 543;  // พ.ศ.
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const s = String(seq).padStart(3, "0");
  return `SO-${yyyyBE}${mm}${dd}${s}`;
}

/** หาเลขเอกสารล่าสุดของ “วันนั้น (ค.ศ.)” แต่ prefix ใช้ “พ.ศ.” */
async function generateDocNo_BE(forDate: Date) {
  const d = normalizeChristianYear(forDate); // ค.ศ. date-only
  const yyyyBE = d.getFullYear() + 543;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const prefix = `SO-${yyyyBE}${mm}${dd}`;

  const last = await prisma.sale.findFirst({
    where: { docNo: { startsWith: prefix } },
    orderBy: { docNo: "desc" },
    select: { docNo: true },
  });

  let nextSeq = 1;
  if (last?.docNo) nextSeq = (parseInt(last.docNo.slice(-3), 10) || 0) + 1;
  return buildDocNo_BE(d, nextSeq);
}

/** หา/สร้างลูกค้า:
 * - ถ้ามี phone/email ตรงกับของเดิม → ใช้ลูกค้าเดิม (และเติม address ถ้าเดิมว่าง)
 * - ถ้าไม่ชนใครเลย → สร้างใหม่ (ชื่ออย่างเดียวก็ได้ / หรือชื่อ+เบอร์/อีเมล/ที่อยู่)
 */
async function findOrCreateCustomer(reqCust: any) {
  const name = (reqCust?.name ? String(reqCust.name) : "").trim();
  const phone = (reqCust?.phone ? String(reqCust.phone) : "").trim() || undefined;
  const email = (reqCust?.email ? String(reqCust.email) : "").trim() || undefined;
  const address =
    (reqCust?.address ? String(reqCust.address) : "").trim() || undefined;

  if (reqCust?.id) {
    const byId = await prisma.customer.findUnique({ where: { id: String(reqCust.id) } });
    if (byId) {
      if (address && !byId.address) {
        await prisma.customer.update({ where: { id: byId.id }, data: { address } });
      }
      return { id: byId.id, name: byId.name };
    }
  }

  if (phone || email) {
    const existed = await prisma.customer.findFirst({
      where: { OR: [...(phone ? [{ phone }] : []), ...(email ? [{ email }] : [])] },
    });
    if (existed) {
      if (address && !existed.address) {
        await prisma.customer.update({ where: { id: existed.id }, data: { address } });
      }
      return { id: existed.id, name: existed.name };
    }
  }

  if (!name && !phone && !email) return { id: null, name: null };

  try {
    const created = await prisma.customer.create({
      data: {
        name: name || phone || email || "CUSTOMER",
        phone,
        email,
        address,
        tags: [],
      },
      select: { id: true, name: true },
    });
    return { id: created.id, name: created.name };
  } catch (e: any) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const again = await prisma.customer.findFirst({
        where: { OR: [...(phone ? [{ phone }] : []), ...(email ? [{ email }] : [])] },
        select: { id: true, name: true },
      });
      if (again) return { id: again.id, name: again.name };
    }
    throw e;
  }
}

/** แปลง/กรองไลน์สินค้า */
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

    // บันทึกลง DB เป็น "ค.ศ." (ป้องกันเพี้ยน), แต่เลขเอกสารจะอิง "พ.ศ."
    const docDate = ensureDocDate(body.docDate);
    const channel: string | null = body.channel ?? null;

    // ลูกค้า
    const { id: customerId, name: customerName } =
      await findOrCreateCustomer(body.customer || {});

    // รายการสินค้า
    const items = normalizeItems(body.items || []);
    if (!items.length) {
      return NextResponse.json({ ok: false, message: "ไม่มีรายการสินค้า" }, { status: 400 });
    }

    // upsert สินค้าให้ครบ
    const codes = Array.from(new Set(items.map((x) => x.code)));
    const present = await prisma.product.findMany({ where: { code: { in: codes } } });
    const pmap = new Map(present.map((p) => [p.code, p]));
    for (const code of codes) {
      if (!pmap.has(code)) {
        const p = await prisma.product.create({
          data: { code, name: code, cost: new D(0), price: new D(0), stock: 0 },
        });
        pmap.set(code, p);
      }
    }

    // กันสต๊อกติดลบ
    for (const it of items) {
      const p = pmap.get(it.code)!;
      if ((p.stock ?? 0) - it.qty < 0) {
        return NextResponse.json(
          { ok: false, message: `สต๊อกไม่พอสำหรับ ${it.code} (คงเหลือ ${p.stock}, ต้องการ ${it.qty})` },
          { status: 400 }
        );
      }
    }

    // คำนวณยอด
    let subtotal = new D(0);
    const linePayload = items.map((it) => {
      const p = pmap.get(it.code)!;
      const amount = new D(it.qty).mul(it.price).minus(it.discount);
      subtotal = subtotal.plus(amount);
      const costEach = new D(p.cost ?? 0);
      const cogs = costEach.mul(it.qty);
      return {
        productId: p.id,
        qty: it.qty,
        price: new D(it.price),
        discount: new D(it.discount),
        amount,
        costEach,
        cogs,
        name: it.name || p.name,
      };
    });

    const vat = subtotal.mul(0.07);
    const grand = subtotal.plus(vat);
    const totalCogs = linePayload.reduce((a, x) => a.plus(x.cogs), new D(0));
    const gross = grand.minus(totalCogs);

    // ออกเลขเอกสารอิง "พ.ศ."
    const wantDocNo = typeof body.docNo === "string" ? body.docNo.trim() : "";
    let finalDocNo = wantDocNo || (await generateDocNo_BE(docDate));

    // ทำงานในทรานแซคชัน + กันชน docNo ซ้ำ (retry <= 5)
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const created = await prisma.$transaction(async (tx) => {
          if (!(attempt === 0 && wantDocNo)) {
            finalDocNo = await generateDocNo_BE(docDate);
          }

          const sale = await tx.sale.create({
            data: {
              docNo: finalDocNo,
              docDate,       // ค.ศ. date-only
              date: docDate, // ใช้ field นี้ในการแสดง/เรียง
              channel,
              customer: customerName || null,
              customerId: customerId || null,
              total: grand,
              totalCost: totalCogs,
              status: "NEW",
              createdBy: userId,
              items: {
                create: linePayload.map((x) => ({
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
            select: { id: true, docNo: true },
          });

          // หักสต๊อก
          await Promise.all(
            linePayload.map((x) =>
              tx.product.update({
                where: { id: x.productId },
                data: { stock: { decrement: x.qty } },
              })
            )
          );

          return sale;
        });

        return NextResponse.json({
          ok: true,
          saleId: created.id,
          docNo: created.docNo,
          totals: {
            subtotal: r2(subtotal),
            vat: r2(vat),
            grand: r2(grand),
            totalCogs: r2(totalCogs),
            gross: r2(gross),
          },
        });
      } catch (e: any) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          const target = (e.meta?.target ?? []) as unknown as string[] | string;
          const isDocNoConflict = Array.isArray(target)
            ? target.includes("docNo")
            : typeof target === "string"
            ? target.includes("docNo")
            : false;
          if (isDocNoConflict) continue;
        }
        throw e;
      }
    }

    return NextResponse.json(
      { ok: false, message: "ออกเลขเอกสารไม่สำเร็จ (ชนหลายครั้ง)" },
      { status: 409 }
    );
  } catch (err: any) {
    console.error("POST /api/sales error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

/** ------------------------ GET: List Sales + Pagination ------------------------ */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const statusParam = (searchParams.get("status") || "ALL").toUpperCase();

    // Pagination
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSizeRaw = Number(searchParams.get("pageSize") || 20);
    const pageSize = Math.min(Math.max(5, pageSizeRaw), 100);

    const baseWhere: any = {};
    if (from) baseWhere.date = { gte: ensureDocDate(from) };
    if (to)
      baseWhere.date = {
        ...(baseWhere.date || {}),
        lte: new Date(ensureDocDate(to).getTime() + 24 * 60 * 60 * 1000 - 1),
      };

    // ตัวนับทุกสถานะ
    const countersSeed = await prisma.sale.findMany({
      where: baseWhere,
      select: { status: true },
    });
    const counters = { ALL: 0, NEW: 0, PENDING: 0, CONFIRMED: 0, CANCELLED: 0 };
    for (const s of countersSeed) {
      counters.ALL += 1;
      const k = (s.status || "NEW").toUpperCase() as keyof typeof counters;
      if (k in counters) counters[k] += 1;
    }

    const where: any = { ...baseWhere };
    if (statusParam !== "ALL") where.status = statusParam;

    const totalCount = await prisma.sale.count({ where });

    const sales = await prisma.sale.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        items: true,
        user: { select: { id: true, username: true, name: true } },
        customerRef: { select: { id: true, name: true, phone: true, email: true, address: true } },
      },
    });

    const allForSummary = await prisma.sale.findMany({
      where,
      select: {
        total: true,
        totalCost: true,
        items: { select: { cogs: true } },
      },
    });

    const summary = allForSummary.reduce(
      (acc, s) => {
        const total = new D(s.total || 0);
        const cogs =
          s.totalCost != null
            ? new D(s.totalCost)
            : s.items.reduce((t, i) => t.plus(i.cogs), new D(0));

        acc.count += 1;
        acc.total = r2(new D(acc.total).plus(total));
        acc.cogs = r2(new D(acc.cogs).plus(cogs));
        acc.gross = r2(new D(acc.total).minus(acc.cogs));
        return acc;
      },
      { count: 0, total: 0, cogs: 0, gross: 0 }
    );

    return NextResponse.json({
      ok: true,
      summary,
      counters,
      sales,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
      },
    });
  } catch (err: any) {
    console.error("GET /api/sales error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
