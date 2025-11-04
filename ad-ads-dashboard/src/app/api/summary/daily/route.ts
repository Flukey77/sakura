import { prisma } from "@/lib/prisma";
import { parseISO, startOfDay, endOfDay } from "date-fns";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function GET(req: Request) {
  const url = new URL(req.url);
  const ds = url.searchParams.get("date"); // yyyy-MM-dd
  if (!ds) return new Response(JSON.stringify({ error: "missing date" }), { status: 400 });
  const from = startOfDay(parseISO(ds));
  const to = endOfDay(parseISO(ds));

  const rows = await prisma.adMetric.findMany({
    where: { date: { gte: from, lte: to } },
  });

  const total = rows.reduce(
    (acc, r) => {
      acc.impressions += r.impressions;
      acc.clicks += r.clicks;
      acc.spend += r.spend;
      acc.conversions += r.conversions;
      return acc;
    },
    { impressions: 0, clicks: 0, spend: 0, conversions: 0 }
  );

  const byPlatform = rows.reduce<Record<string, typeof total>>((acc, r) => {
    const k = r.platform;
    acc[k] = acc[k] || { impressions: 0, clicks: 0, spend: 0, conversions: 0 };
    acc[k].impressions += r.impressions;
    acc[k].clicks += r.clicks;
    acc[k].spend += r.spend;
    acc[k].conversions += r.conversions;
    return acc;
  }, {});

  const campaigns = rows.map(r => ({
    platform: r.platform,
    campaignName: r.campaignName,
    impressions: r.impressions,
    clicks: r.clicks,
    spend: r.spend,
    conversions: r.conversions,
  }));

  return new Response(JSON.stringify({ date: ds, total, byPlatform, campaigns }), { status: 200 });
}
