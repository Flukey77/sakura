// src/app/api/ads/import/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AdChannel, Prisma } from "@prisma/client";

/**
 * POST /api/ads/import
 * รับไฟล์ CSV (multipart/form-data) คอลัมน์อย่างน้อย: date,channel,amount
 * ออปชัน: campaign, adset
 * รองรับ channel แบบไม่แคส: Facebook / TikTok
 *
 * กลยุทธ์:
 * - รวมยอดซ้ำในไฟล์เดียวกันก่อน (key = date+channel+campaign)
 * - แล้วค่อย upsert แบบเช็ค findFirst → update / create
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, message: "ไม่พบไฟล์ (ต้องแนบไฟล์ CSV ในฟิลด์ 'file')" },
        { status: 400 }
      );
    }

    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      return NextResponse.json(
        { ok: false, message: "ไฟล์ว่างหรือมีเพียง header" },
        { status: 400 }
      );
    }

    // header
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const idx = (k: string) => header.indexOf(k);

    if (idx("date") < 0 || idx("channel") < 0 || idx("amount") < 0) {
      return NextResponse.json(
        { ok: false, message: "หัวตารางต้องมีคอลัมน์: date, channel, amount" },
        { status: 400 }
      );
    }

    // map channel text -> enum
    const toChannel = (s: string | undefined): AdChannel | null => {
      const v = (s || "").trim().toLowerCase();
      if (v === "facebook") return AdChannel.FACEBOOK;
      if (v === "tiktok") return AdChannel.TIKTOK;
      return null;
    };

    type Row = {
      date: Date; // DATE-only (00:00:00)
      channel: AdChannel;
      campaignName?: string | null;
      adsetName?: string | null;
      amount: Prisma.Decimal; // Decimal for DB
    };

    // รวมยอดซ้ำในไฟล์เดียวกันก่อน (key = yyyy-mm-dd|channel|campaignName)
    const bucket = new Map<string, Row>();

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      const dateRaw = cols[idx("date")] || "";
      const d = new Date(dateRaw);
      const ch = toChannel(cols[idx("channel")]);
      const amt = Number(cols[idx("amount")] || 0);

      if (Number.isNaN(d.getTime()) || !ch || !(amt >= 0)) continue;

      // ให้เป็น DATE-only
      const dateOnly = new Date(d.toISOString().slice(0, 10));
      const campaign = idx("campaign") >= 0 ? cols[idx("campaign")] || null : null;
      const adset = idx("adset") >= 0 ? cols[idx("adset")] || null : null;

      const key = `${dateOnly.toISOString().slice(0, 10)}|${ch}|${campaign ?? ""}`;

      if (!bucket.has(key)) {
        bucket.set(key, {
          date: dateOnly,
          channel: ch,
          campaignName: campaign,
          adsetName: adset,
          amount: new Prisma.Decimal(amt),
        });
      } else {
        // รวมยอดซ้ำในไฟล์เดียวกัน
        const prev = bucket.get(key)!;
        prev.amount = prev.amount.plus(amt);
      }
    }

    const rows = Array.from(bucket.values());
    if (!rows.length) {
      return NextResponse.json(
        { ok: false, message: "ไม่พบข้อมูลที่ถูกต้องในไฟล์" },
        { status: 400 }
      );
    }

    // ✅ ใช้ callback overload ของ $transaction เพื่อแก้ Type Error
    await prisma.$transaction(async (tx) => {
      for (const r of rows) {
        const exists = await tx.adSpendDaily.findFirst({
          where: {
            date: r.date,
            channel: r.channel,
            campaignName: r.campaignName ?? null,
          },
          select: { id: true },
        });

        if (exists) {
          await tx.adSpendDaily.update({
            where: { id: exists.id },
            data: {
              amount: r.amount,
              adsetName: r.adsetName ?? null,
            },
          });
        } else {
          await tx.adSpendDaily.create({
            data: {
              date: r.date,
              channel: r.channel,
              campaignName: r.campaignName ?? null,
              adsetName: r.adsetName ?? null,
              amount: r.amount,
            },
          });
        }
      }
    });

    return NextResponse.json({
      ok: true,
      imported: rows.length,
      message: "นำเข้าข้อมูลสำเร็จ",
    });
  } catch (err: any) {
    console.error("POST /api/ads/import error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
