// src/app/api/sales/[id]/customer/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// ทำให้ไฟล์เป็นโมดูลแน่นอน และบอก runtime ให้ชัด
export const runtime = "nodejs";

type Role = "ADMIN" | "EMPLOYEE";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1) Auth
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
      body?.phone != null ? String(body.phone).trim() || null : null;
    const email =
      body?.email != null ? String(body.email).trim() || null : null;
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

    // เคส 1: ผูกลูกค้าอยู่แล้ว -> อัปเดตที่ Customer
    if (sale.customerId) {
      await prisma.customer.update({
        where: { id: sale.customerId },
        data: {
          name: name || undefined,
          phone: phone ?? undefined,
          email: email ?? undefined,
          address: address || undefined,
        },
      });

      await prisma.sale.update({
        where: { id: sale.id },
        data: { customer: name || undefined },
      });

      return NextResponse.json({ ok: true });
    }

    // เคส 2: ยังไม่ผูก และมี phone/email -> upsert Customer
    if (phone || email) {
      const existing = await prisma.customer.findFirst({
        where: {
          OR: [
            ...(phone ? [{ phone }] : []),
            ...(email ? [{ email }] : []),
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
              phone,
              email,
              address: address || "",
              tags: [],
            },
          });

      await prisma.sale.update({
        where: { id: sale.id },
        data: {
          customerId: customer.id,
          customer: name || undefined,
        },
      });

      return NextResponse.json({ ok: true });
    }

    // เคส 3: ไม่มี phone/email -> เก็บชื่อไว้โชว์ใน Sale.customer
    await prisma.sale.update({
      where: { id: sale.id },
      data: { customer: name || "" },
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
