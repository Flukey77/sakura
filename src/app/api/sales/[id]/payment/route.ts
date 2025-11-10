import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma, PaymentStatus } from "@prisma/client";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const nextRaw = String(body?.status || "").toUpperCase() as PaymentStatus;
    const valid = Object.values(PaymentStatus).includes(nextRaw);
    if (!valid) {
      return NextResponse.json(
        { ok: false, message: "สถานะไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const sale = await prisma.sale.update({
      where: { id: params.id },
      data: { paymentStatus: nextRaw },
      select: { id: true, paymentStatus: true },
    });

    return NextResponse.json({ ok: true, sale });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
