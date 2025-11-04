import { prisma } from "@/lib/prisma";
import { subDays, startOfDay } from "date-fns";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function POST() {
  const today = new Date();
  for (let i = 1; i <= 7; i++) {
    const d = startOfDay(subDays(today, i));
    await prisma.adMetric.create({
      data: {
        platform: "FACEBOOK",
        accountId: "act_123",
        campaignId: `fb_${i}`,
        campaignName: `FB Campaign ${i}`,
        date: d,
        impressions: 1000 * i,
        clicks: 100 * i,
        spend: 50 * i,
        conversions: 5 * i,
      },
    });
    await prisma.adMetric.create({
      data: {
        platform: "TIKTOK",
        accountId: "adv_123",
        campaignId: `tt_${i}`,
        campaignName: `TT Campaign ${i}`,
        date: d,
        impressions: 800 * i,
        clicks: 80 * i,
        spend: 30 * i,
        conversions: 3 * i,
      },
    });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
