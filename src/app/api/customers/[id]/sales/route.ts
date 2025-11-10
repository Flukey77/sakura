import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

/** GET /api/customers/:id/sales  – รายการขายของลูกค้าคนนี้ */
export async function GET(_req: Request, { params }: Params) {
  const id = params.id;

  const sales = await prisma.sale.findMany({
    where: { customerId: id },
    orderBy: { date: "desc" },
    take: 200,
    select: {
      id: true,
      docNo: true,
      date: true,
      total: true,
      channel: true,
      status: true,
    },
  });

  return NextResponse.json({ ok: true, items: sales });
}
