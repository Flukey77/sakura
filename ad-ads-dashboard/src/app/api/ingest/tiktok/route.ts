import { fetchTikTokDaily } from "@/lib/tiktok";
import { prisma } from "@/lib/prisma";
import { parseISO, startOfDay } from "date-fns";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function POST(req: Request) {
  const url = new URL(req.url);
  const ds = url.searchParams.get("date");
  const date = ds ? parseISO(ds) : undefined;

  try {
    const rows = await fetchTikTokDaily(date);
    for (const r of rows) {
      await prisma.adMetric.upsert({
        where: {
          platform_accountId_campaignId_date: {
            platform: "TIKTOK",
            accountId: r.accountId,
            campaignId: r.campaignId,
            date: startOfDay(new Date(r.date)),
          },
        },
        create: {
          platform: "TIKTOK",
          accountId: r.accountId,
          campaignId: r.campaignId,
          campaignName: r.campaignName,
          date: startOfDay(new Date(r.date)),
          impressions: r.impressions,
          clicks: r.clicks,
          spend: r.spend,
          conversions: r.conversions,
        },
        update: {
          campaignName: r.campaignName,
          impressions: r.impressions,
          clicks: r.clicks,
          spend: r.spend,
          conversions: r.conversions,
        },
      });
    }
    return new Response(JSON.stringify({ ok: true, inserted: rows.length }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "fetch error" }), { status: 400 });
  }
}
