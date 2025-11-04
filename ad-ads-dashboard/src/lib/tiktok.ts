import axios from "axios";
import { subDays, format } from "date-fns";

const accessToken = process.env.TIKTOK_ACCESS_TOKEN!;
const advertiserId = process.env.TIKTOK_ADVERTISER_ID!;

// หมายเหตุ: metrics/fields อาจต่างตามเวอร์ชัน API ของคุณ
export async function fetchTikTokDaily(date?: Date) {
  const target = date ?? subDays(new Date(), 1);
  const ds = format(target, "yyyy-MM-dd");

  const url = "https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/";
  const body = {
    advertiser_id: advertiserId,
    report_type: "BASIC",
    data_level: "AUCTION_CAMPAIGN",
    dimensions: ["stat_time_day", "campaign_id", "campaign_name"],
    metrics: ["spend", "impressions", "clicks", "conversions"],
    start_date: ds,
    end_date: ds,
    time_granularity: "DAILY",
  };

  const { data } = await axios.post(url, body, {
    headers: {
      "Access-Token": accessToken,
      "Content-Type": "application/json",
    },
  });

  const list = data?.data?.list || [];
  return list.map((row: any) => ({
    platform: "TIKTOK" as const,
    accountId: advertiserId,
    campaignId: String(row.campaign_id),
    campaignName: String(row.campaign_name),
    date: ds,
    impressions: Number(row.impressions || 0),
    clicks: Number(row.clicks || 0),
    spend: Number(row.spend || 0),
    conversions: Number(row.conversions || 0),
  }));
}
