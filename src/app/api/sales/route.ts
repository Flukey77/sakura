// src/app/api/sales/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

const D = Prisma.Decimal;
const r2 = (x: number | string | Prisma.Decimal) =>
  Number(new D(x ?? 0).toDecimalPlaces(2));

function todayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** YYYY-MM-DD/ISO หรือ dd/mm/yyyy (รองรับปี พ.ศ.) -> Date (fallback today) */
function toDateThaiAware(x?: string): Date {
  if (!x) return todayLocal();
  const d = new Date(x);
  if (!isNaN(d.getTime())) return d;

  const m = String(x).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const dd = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10) - 1;
    let yy = parseInt(m[3], 10);
    if (yy > 2500) yy -= 543; // พ.ศ. -> ค.ศ.
    return new Date(yy, mm, dd);
  }
  return todayLocal();
}

function normalizeChristianYear(d: Date) {
  let y = d.getFullYear();
  if (y > 2200) {
    y -= 543;
    return new Date(y, d.getMonth(), d.getDate());
  }
  return d;
}

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

function buildDocNo(d: Date, seq: number) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const s = String(seq).padStart(3, "0");
  return `SO-${yyyy}${mm}${dd}${s}`;
}

async function generateDocNo(forDate: Date) {
  const yyyy = forDate.getFullYear();
  const mm = String(forDate.getMonth() + 1).padStart(2, "0");
  const dd = String(forDate.getDate()).padStart(2, "0");
  const prefix = `SO-${yyyy}${mm}${dd}`;

  const last = await prisma.sale.findFirst({
    where: { docNo: { startsWith: prefix } },
    orderBy: { docNo: "desc" },
    select: { docNo: true },
  });

  let nextSeq = 1;
  if (last?.docNo) {
    nextSeq = (parseInt(last.docNo.slice(-3), 10) || 0) + 1;
  }
  return buildDocNo(forDate, nextSeq);
}

async function findOrCreateCustomer(reqCust: any) {
  const name = (reqCust?.name ? String(reqCust.name) : "").trim();
  const phone = (reqCust?.phone ? String(reqCust.phone) : "").trim() || undefined;
  const email = (reqCust?.email ? String(reqCust.email) : "").trim() || undefined;
  const address =
    (reqCust?.address ? String(reqCust.address) : "").trim() || undefined;

  if (reqCust?.id) {
    const byId = await prisma.customer.findUnique({
      where: { id: String(reqCust.id) },
    });
    if (byId) {
      if (address && !byId.address) {
        await prisma.customer.update({ where: { id: byId.id }, data: { address } });
      }
      return { id: byId.id, name: byId.name };
    }
  }

  const existed = await prisma.customer.findFirst({
    where: {
      OR: [
        ...(phone ? [{ phone }] : []),
        ...(email ? [{ email }] : []),
      ],
    },
  });

  if (existed) {
    if (address && !existed.address) {
      await prisma.customer.update({ where: { id: existed.id }, data: { address } });
    }
    return { id: existed.id, name: existed.name };
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
        where: {
          OR: [
            ...(phone ? [{ phone }] : []),
            ...(email ? [{ email }] : []),
          ],
        },
        select: { id: true, name: true },
      });
      if (again) return { id: again.id, name: again.name };
    }
    throw e;
  }
}

/* ----------------------------------- POST ---------------------------------- */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ ok: false, message: "ไม่ได้ล็อกอิน" }, { status: 401 });
    }

    const body = await req.json();

    let docDate = toDateThaiAware(body.docDate);
    docDate = normalizeChristianYear(docDate);

    const channel: string | null = body.channel ?? null;

    const { id: customerId, name: customerName } =
      await findOrCreateCustomer(body.customer || {});

    const items = normalizeItems(body.items || []);
    if (!items.length) {
      return NextResponse.json({ ok: false, message: "ไม่มีรายการสินค้า" }, { status: 400 });
    }

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

    for (const it of items) {
      const p = pmap.get(it.code)!;
      if ((p.stock ?? 0) - it.qty < 0) {
        return NextResponse.json(
          { ok: false, message: `สต๊อกไม่พอสำหรับ ${it.code} (คงเหลือ ${p.stock}, ต้องการ ${it.qty})` },
          { status: 400 }
        );
      }
    }

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

    const wantDocNo = typeof body.docNo === "string" ? body.docNo.trim() : "";
    let finalDocNo = wantDocNo || (await generateDocNo(docDate));

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const created = await prisma.$transaction(async (tx) => {
          if (!(attempt === 0 && wantDocNo)) {
            finalDocNo = await generateDocNo(docDate);
          }

          const sale = await tx.sale.create({
            data: {
              docNo: finalDocNo,
              docDate,
              date: docDate,
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
            select: { id: true, docNo: true, docDate: true },
          });

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
          docDate: created.docDate,
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

/* ------------------------------------ GET ---------------------------------- */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role as string | undefined;
    const isAdmin = role === "ADMIN";

    const { searchParams } = new URL(req.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const statusParam = (searchParams.get("status") || "ALL").toUpperCase();

    const doc = (searchParams.get("doc") || "").trim();
    const customer = (searchParams.get("customer") || "").trim();
    const channel = (searchParams.get("channel") || "").trim();
    const q = (searchParams.get("q") || "").trim();

    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSizeRaw = Number(searchParams.get("pageSize") || 10);
    const pageSize = Math.min(Math.max(5, pageSizeRaw), 100);

    const mode = Prisma.QueryMode.insensitive;

    // ---- baseWhere (รวมทุกฟิลเตอร์อย่าง type-safe) ----
    const baseAnd: Prisma.SaleWhereInput[] = [];

    // ช่วงวันที่: ครอบคลุมทั้ง docDate และ date
    if (from || to) {
      const range: Prisma.DateTimeFilter = {};
      if (from) range.gte = toDateThaiAware(from);
      if (to) {
        const t = toDateThaiAware(to);
        t.setHours(23, 59, 59, 999);
        range.lte = t;
      }
      baseAnd.push({ OR: [{ docDate: range }, { date: range }] });
    }

    // ฟิลเตอร์เจาะจง
    if (doc) baseAnd.push({ docNo: { contains: doc, mode } });
    if (channel) baseAnd.push({ channel: { contains: channel, mode } });
    if (customer) {
      baseAnd.push({
        OR: [
          { customer: { contains: customer, mode } },
          { customerRef: { name: { contains: customer, mode } } },
        ],
      });
    }

    // คำค้นรวม
    const baseOr: Prisma.SaleWhereInput[] = [];
    if (q) {
      baseOr.push(
        { docNo: { contains: q, mode } },
        { customer: { contains: q, mode } }
      );
    }

    const baseWhere: Prisma.SaleWhereInput = {};
    if (baseAnd.length) baseWhere.AND = baseAnd;
    if (baseOr.length) baseWhere.OR = baseOr;

    // where สำหรับตาราง
    let where: Prisma.SaleWhereInput = { ...baseWhere, deletedAt: null };
    if (statusParam === "DELETED") {
      if (!isAdmin) {
        return NextResponse.json({ ok: false, message: "forbidden" }, { status: 403 });
      }
      where = { ...baseWhere, NOT: { deletedAt: null } };
    } else if (statusParam !== "ALL") {
      where = { ...where, status: statusParam };
    }

    // counters (รวมทั้งหมดก่อน แล้วแยก DELETED)
    const countersSeed = await prisma.sale.findMany({
      where: { ...baseWhere },
      select: { status: true, deletedAt: true },
    });
    const counters = { ALL: 0, NEW: 0, PENDING: 0, CONFIRMED: 0, CANCELLED: 0, DELETED: 0 };
    for (const s of countersSeed) {
      counters.ALL += 1;
      if (s.deletedAt) counters.DELETED += 1;
      const k = (s.status || "NEW").toUpperCase() as keyof typeof counters;
      if (!s.deletedAt && k in counters) counters[k] += 1;
    }

    const totalCount = await prisma.sale.count({ where });

    // ✅ เรียงล่าสุดบนสุดแบบเสถียร
    const rows = await prisma.sale.findMany({
      where,
      orderBy: [{ docDate: "desc" }, { date: "desc" }, { docNo: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        docNo: true,
        docDate: true,
        date: true,
        customer: true,
        channel: true,
        total: true,
        status: true,
        deletedAt: true,
        customerRef: { select: { name: true } },
        items: { select: { cogs: true } },
        totalCost: true,
      },
    });

    const sales = rows.map((r) => ({
      id: r.id,
      docNo: r.docNo,
      docDate: r.docDate,
      date: r.date,
      customer: r.customer ?? r.customerRef?.name ?? null,
      channel: r.channel,
      total: Number(r.total || 0),
      status: r.status,
      deletedAt: r.deletedAt,
    }));

    // สรุป (ไม่รวม CANCELLED และ DELETED เมื่อ status=ALL)
    let summaryWhere: Prisma.SaleWhereInput = { ...baseWhere, deletedAt: null };
    if (statusParam !== "ALL" && statusParam !== "DELETED") {
      summaryWhere = { ...summaryWhere, status: statusParam };
    }
    if (statusParam === "ALL") {
      summaryWhere = { ...summaryWhere, NOT: { status: "CANCELLED" } };
    }

    const sRows = await prisma.sale.findMany({
      where: summaryWhere,
      select: { total: true, totalCost: true, items: { select: { cogs: true } } },
    });
    const summaryCount = await prisma.sale.count({ where: summaryWhere });

    const summary = sRows.reduce(
      (acc, s) => {
        const total = new D(s.total || 0);
        const cogs =
          s.totalCost != null
            ? new D(s.totalCost)
            : s.items.reduce((t, i) => t.plus(i.cogs), new D(0));
        acc.total = r2(new D(acc.total).plus(total));
        acc.cogs = r2(new D(acc.cogs).plus(cogs));
        acc.gross = r2(new D(acc.total).minus(acc.cogs));
        return acc;
      },
      { count: summaryCount, total: 0, cogs: 0, gross: 0 }
    );

    return NextResponse.json({
      ok: true,
      isAdmin,
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
