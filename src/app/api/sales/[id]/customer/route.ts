// src/app/api/sales/[id]/customer/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

type Role = "ADMIN" | "EMPLOYEE";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1) Authz
    const session = await auth();
    const role = (session?.user as any)?.role as Role | undefined;

    if (!session || role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    // 2) Params + Body
    const idOrDocNo = decodeURIComponent(params.id);

    const body = await req.json().catch(() => ({} as any));
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const phone =
      body?.phone != null
        ? String(body.phone).trim() || null
        : null; // normalize empty -> null
    const email =
      body?.email != null
        ? String(body.email).trim() || null
        : null; // normalize empty -> null
    const address = typeof body?.address === "string" ? body.address.trim() : "";

    // 3) หา Sale ด้วย id หรือ docNo
    const sale = await prisma.sale.findFirst({
      where: { OR: [{ id: idOrDocNo }, { docNo: idOrDocNo }] },
      select: { id: true, customerId: true },
    });

    if (!sale) {
      return NextResponse.json(
        { ok: false, message: "ไม่พบเอกสาร" },
        { status: 404 }
      );
    }

    // ---------- เคส 1: มี customerId อยู่แล้ว -> อัปเดตที่ตาราง Customer ----------
    if (sale.customerId) {
      await prisma.customer.update({
        where: { id: sale.customerId },
        data: {
          // ใช้ undefined เพื่อ "ไม่แตะ" ฟิลด์ที่เป็นค่าว่าง
          name: name || undefined,
          phone: phone ?? undefined,
          email: email ?? undefined,
          address: address || undefined,
        },
      });

      // เก็บชื่อไว้โชว์ซ้ำที่ Sale.customer (ออปชัน)
      await prisma.sale.update({
        where: { id: sale.id },
        data: { customer: name || undefined },
      });

      return NextResponse.json({ ok: true });
    }

    // ---------- เคส 2: ยังไม่ผูกลูกค้า และมี phone/email -> upsert Customer ----------
    if (phone || email) {
      // พยายามหา customer จาก phone หรือ email ที่ให้มา
      const existing = await prisma.customer.findFirst({
        where: {
          OR: [
            ...(phone ? [{ phone }] as const : []),
            ...(email ? [{ email }] as const : []),
          ],
        },
        select: { id: true },
      });

      const customer = existing
        ? await prisma.customer.update({
            where: { id: existing.id },
            data: {
              name: name || undefined,
              phone: phone ?? undefined,
              email: email ?? undefined,
              address: address || undefined,
            },
          })
        : await prisma.customer.create({
            data: {
              name: name || "",
              phone, // อนุญาตให้เป็น null
              email, // อนุญาตให้เป็น null
              address: address || "",
              tags: [], // ตามสคีมาที่คุณใช้
            },
          });

      await prisma.sale.update({
        where: { id: sale.id },
        data: {
          customerId: customer.id,
          customer: name || undefined, // เก็บชื่อซ้ำไว้โชว์
        },
      });

      return NextResponse.json({ ok: true });
    }

    // ---------- เคส 3: ไม่มี phone/email -> อัปเดตชื่อไว้ใน Sale.customer อย่างเดียว ----------
    await prisma.sale.update({
      where: { id: sale.id },
      data: {
        customer: name || "",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("PUT /api/sales/[id]/customer error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
