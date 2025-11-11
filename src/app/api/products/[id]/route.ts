// src/app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ensureIntId(id: string) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    throw NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }
  return n;
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if ((session.user as any)?.role !== "ADMIN") {
    throw NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return session;
}

/** PATCH /api/products/:id
 *  อนุญาต ADMIN อัปเดต: cost, price, stock, safetyStock (ส่งมาเฉพาะที่ต้องการแก้)
 *  body: { cost?, price?, stock?, safetyStock? }
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const id = ensureIntId(params.id);

    const body = await req.json().catch(() => ({} as any));
    const data: Record<string, any> = {};

    if (body.cost !== undefined) {
      const n = Number(body.cost);
      if (Number.isNaN(n) || n < 0) {
        return NextResponse.json({ error: "Invalid cost" }, { status: 400 });
      }
      data.cost = n;
    }

    if (body.price !== undefined) {
      const n = Number(body.price);
      if (Number.isNaN(n) || n < 0) {
        return NextResponse.json({ error: "Invalid price" }, { status: 400 });
      }
      data.price = n;
    }

    if (body.stock !== undefined) {
      const n = Number(body.stock);
      if (!Number.isInteger(n) || n < 0) {
        return NextResponse.json({ error: "Invalid stock" }, { status: 400 });
      }
      data.stock = n;
    }

    if (body.safetyStock !== undefined) {
      const n = Number(body.safetyStock);
      if (!Number.isInteger(n) || n < 0) {
        return NextResponse.json({ error: "Invalid safetyStock" }, { status: 400 });
      }
      data.safetyStock = n;
    }

    if (!Object.keys(data).length) {
      return NextResponse.json({ error: "No changes" }, { status: 400 });
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
      select: {
        id: true,
        code: true,
        name: true,
        cost: true,
        price: true,
        stock: true,
        safetyStock: true,
      },
    });

    return NextResponse.json({ ok: true, product: updated });
  } catch (e: any) {
    if (e?.status) return e; // rethrow NextResponse errors above
    return NextResponse.json({ error: e?.message ?? "Update failed" }, { status: 500 });
  }
}

/** DELETE /api/products/:id  (ADMIN เท่านั้น) */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const id = ensureIntId(params.id);

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status) return e;
    // FK constraint
    if (e?.code === "P2003") {
      return NextResponse.json(
        {
          error:
            "ลบไม่ได้เพราะยังมีข้อมูลที่อ้างถึงสินค้าอยู่ (foreign key) — ตรวจสอบความสัมพันธ์หรือ onDelete: Cascade ใน schema.prisma",
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: e?.message ?? "Delete failed" }, { status: 500 });
  }
}
