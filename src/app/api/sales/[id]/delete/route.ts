import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

/* POST /api/sales/[id]/delete */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role as string | undefined;
    const userId = (session?.user as any)?.id as string | undefined;

    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ ok: false, message: "forbidden" }, { status: 403 });
    }

    const idOrDoc = decodeURIComponent(params?.id ?? "");
    const target = await prisma.sale.findFirst({
      where: { OR: [{ id: idOrDoc }, { docNo: idOrDoc }] },
      select: { id: true, deletedAt: true },
    });
    if (!target) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
    if (target.deletedAt) {
      return NextResponse.json({ ok: true, deleted: false, message: "already deleted" });
    }

    const updated = await prisma.sale.update({
      where: { id: target.id },
      data: { deletedAt: new Date(), deletedBy: userId ?? null },
      select: { id: true, docNo: true, deletedAt: true },
    });

    return NextResponse.json({ ok: true, deleted: true, sale: updated });
  } catch (err: any) {
    console.error("POST /api/sales/[id]/delete error:", err);
    return NextResponse.json({ ok: false, message: err?.message ?? "delete failed" }, { status: 500 });
  }
}
