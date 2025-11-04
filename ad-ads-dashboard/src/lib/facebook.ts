import axios from "axios";
import { subDays, format } from "date-fns";

type FBInsight = {
  campaign_id: string;
  campaign_name: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  actions?: { action_type: string; value: string }[];
  date_start: string;
  date_stop: string;
};

const version = process.env.FB_API_VERSION || "v21.0";
const token = process.env.FB_ACCESS_TOKEN!;
const accounts = (process.env.FB_AD_ACCOUNT_IDS || "").split(",").map(s => s.trim()).filter(Boolean);

function actionsToConversions(actions?: FBInsight["actions"]) {
  if (!actions) return 0;
  // รวม action ที่เกี่ยวกับ purchase / conversion
  const keys = new Set([
    "offsite_conversion.fb_pixel_purchase",
    "purchase",
    "offsite_conversion",
    "omni_purchase",
  ]);
  let sum = 0;
  for (const a of actions) {
    if (keys.has(a.action_type)) {
      sum += Number(a.value || 0);
    }
  }
  return sum;
}

export async function fetchFacebookDaily(date?: Date) {
  const target = date ?? subDays(new Date(), 1); // ค่าปริยาย = เมื่อวาน
  const ds = format(target, "yyyy-MM-dd");
  const result: Array<{
    platform: "FACEBOOK";
    accountId: string;
    campaignId: string;
    campaignName: string;
    date: string;
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
  }> = [];

  for (const account of accounts) {
    const url = `https://graph.facebook.com/${version}/${account}/insights`;
    const params = {
      fields: [
        "campaign_id",
        "campaign_name",
        "spend",
        "impressions",
        "clicks",
        "actions",
        "date_start",
        "date_stop",
      ].join(","),
      time_range: JSON.stringify({ since: ds, until: ds }),
      time_increment: 1,
      access_token: token,
      level: "campaign",
    };
    const { data } = await axios.get<{ data: FBInsight[] }>(url, { params });
    for (const row of data.data) {
      result.push({
        platform: "FACEBOOK",
        accountId: account,
        campaignId: row.campaign_id,
        campaignName: row.campaign_name,
        date: ds,
        impressions: Number(row.impressions || 0),
        clicks: Number(row.clicks || 0),
        spend: Number(row.spend || 0),
        conversions: actionsToConversions(row.actions),
      });
    }
  }
  return result;
}
