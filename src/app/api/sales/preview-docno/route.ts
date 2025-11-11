import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// รับ date=YYYY-MM-DD หรือ dd/MM/yyyy (พ.ศ.ก็ได้) -> Date
function parseThaiAware(x?: string): Date {
  const now = new Date();
  if (!x) return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d = new Date(x);
  if (!isNaN(d.getTime())) return d;
  const m = String(x).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const dd = +m[1], mm = +m[2] - 1; let yy = +m[3];
    if (yy > 2500) yy -= 543;
    return new Date(yy, mm, dd);
  }
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
const pad = (n: number) => String(n).padStart(2, "0");
const buildDocNo = (d: Date, seq: number) =>
  `SO-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${String(seq).padStart(3, "0")}`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const d = parseThaiAware(searchParams.get("date") || undefined);

  const prefix = `SO-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

  const last = await prisma.sale.findFirst({
    where: { docNo: { startsWith: prefix } },
    orderBy: { docNo: "desc" },
    select: { docNo: true },
  });

  const nextSeq = last?.docNo ? (parseInt(last.docNo.slice(-3), 10) || 0) + 1 : 1;
  return NextResponse.json({ ok: true, preview: buildDocNo(d, nextSeq) });
}
