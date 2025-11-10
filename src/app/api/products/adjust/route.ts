import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

const r2 = (n: number | string | Decimal) =>
  Number(new Decimal(n).toDecimalPlaces(2));

/**
 * POST /api/products/adjust
 *
 * body:
 *  {
 *    mode: "purchase" | "set" | "increase" | "decrease" | "issue",
 *    items: [
 *      { code: "65551", name?: "ชื่อ", qty: 500, cost?: 200, price?: 300, stock?: 500 }
 *    ]
 *  }
 *
 * - purchase: รับเข้าคลังแบบซื้อ (stock += qty) และคำนวณ "ต้นทุนถัวเฉลี่ย"
 * - set: ตั้งค่า stock / cost / price ตรงๆ (สำหรับตั้งต้น)
 * - increase: เพิ่ม stock เฉยๆ
 * - decrease|issue: ลด stock เฉยๆ
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mode: "purchase" | "set" | "increase" | "decrease" | "issue" =
      body.mode;
    const items: any[] = body.items || [];

    if (!mode) {
      return NextResponse.json({ ok: false, message: "กรุณาระบุ mode" }, { status: 400 });
    }
    if (!items.length) {
      return NextResponse.json({ ok: false, message: "ไม่มี items" }, { status: 400 });
    }

    // ดึงสินค้าเดิม
    const codes = Array.from(new Set(items.map((x) => String(x.code))));
    const exist = await prisma.product.findMany({ where: { code: { in: codes } } });
    const map = new Map(exist.map((p) => [p.code, p]));

    // สร้างสินค้าใหม่ถ้าไม่เจอ
    const creates = [];
    for (const it of items) {
      if (!map.has(it.code)) {
        creates.push(
          prisma.product.create({
            data: {
              code: it.code,
              name: it.name || it.code,
              cost: new Decimal(it.cost ?? 0),
              price: new Decimal(it.price ?? 0),
              stock: Number(it.stock ?? 0),
            },
          })
        );
      }
    }
    if (creates.length) {
      const created = await prisma.$transaction(creates);
      for (const p of created) map.set(p.code, p);
    }

    // ปรับคลัง
    const ops: any[] = [];
    for (const raw of items) {
      const p = map.get(String(raw.code));
      if (!p) continue;

      const qty = Number(raw.qty ?? 0);
      const stock = Number(raw.stock ?? 0);
      const cost = new Decimal(raw.cost ?? p.cost);
      const price = new Decimal(raw.price ?? p.price);

      if (mode === "purchase") {
        // เฉลี่ยต้นทุนใหม่: (stockเก่า*costเก่า + qtyใหม่*costใหม่) / (stockเก่า+qtyใหม่)
        const oldStock = Number(p.stock);
        const oldCost = new Decimal(p.cost);
        const newStock = oldStock + qty;

        const newCost =
          newStock > 0
            ? oldCost.mul(oldStock).plus(cost.mul(qty)).div(newStock)
            : cost;

        ops.push(
          prisma.product.update({
            where: { id: p.id },
            data: {
              stock: { increment: qty },
              cost: newCost,
              price, // อัปเดตราคาขายได้ถ้าส่งมา
            },
          })
        );
      } else if (mode === "set") {
        ops.push(
          prisma.product.update({
            where: { id: p.id },
            data: {
              stock,
              cost,
              price,
              name: raw.name ?? p.name,
            },
          })
        );
      } else if (mode === "increase") {
        ops.push(
          prisma.product.update({
            where: { id: p.id },
            data: { stock: { increment: qty } },
          })
        );
      } else if (mode === "decrease" || mode === "issue") {
        // ป้องกันติดลบเบื้องต้น
        if (Number(p.stock) - qty < 0) {
          return NextResponse.json(
            { ok: false, message: `สต๊อกไม่พอสำหรับ ${p.code} (คงเหลือ ${p.stock}, ต้องการ ${qty})` },
            { status: 400 }
          );
        }
        ops.push(
          prisma.product.update({
            where: { id: p.id },
            data: { stock: { decrement: qty } },
          })
        );
      }
    }

    if (ops.length) await prisma.$transaction(ops);

    const products = await prisma.product.findMany({
      where: { code: { in: codes } },
      orderBy: { code: "asc" },
    });
    return NextResponse.json({ ok: true, products });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, message: e.message ?? "error" }, { status: 500 });
  }
}

