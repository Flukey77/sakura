import { format } from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ManualIngestButton from "@/components/ManualIngestButton";
import { DailySummaryChart } from "@/components/Charts";

async function getSummary(ds: string) {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const res = await fetch(`${base}/api/summary/daily?date=${ds}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const today = new Date();
  const ds = format(today, "yyyy-MM-dd");
  const summary = await getSummary(ds);

  const platformRows =
    summary
      ? Object.entries(summary.byPlatform || {}).map(([name, v]: any) => ({
          name,
          spend: v.spend,
          clicks: v.clicks,
          conversions: v.conversions,
        }))
      : [];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">ภาพรวม</h1>
          <p className="text-sm text-gray-500">ยอดรวมรายวัน • {ds}</p>
        </div>

        <ManualIngestButton
          endpoints={["/api/ingest/facebook", "/api/ingest/tiktok"]}
          label="ดึงข้อมูลวันนี้ (manual)"
        />
      </div>

      {!summary ? (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          ยังไม่มีข้อมูลวันนี้ — ลองกด “ดึงข้อมูลวันนี้ (manual)” หรือรอ Cron
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <StatCard title="ค่าใช้จ่ายโฆษณา (Spend)" value={summary.total.spend.toFixed(2)} />
            <StatCard title="การแสดงผล (Impressions)" value={summary.total.impressions.toLocaleString()} />
            <StatCard title="คลิก (Clicks)" value={summary.total.clicks.toLocaleString()} />
            <StatCard title="คอนเวอร์ชัน (Conversions)" value={summary.total.conversions.toLocaleString()} />
          </div>

          <div className="rounded-lg bg-white p-4 shadow">
            <h2 className="mb-3 font-medium">ยอดตามแพลตฟอร์ม</h2>
            <DailySummaryChart data={platformRows} />
          </div>

          <div className="rounded-lg bg-white shadow">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-2">แพลตฟอร์ม</th>
                  <th className="px-4 py-2">แคมเปญ</th>
                  <th className="px-4 py-2">Spend</th>
                  <th className="px-4 py-2">Clicks</th>
                  <th className="px-4 py-2">Impressions</th>
                  <th className="px-4 py-2">Conversions</th>
                </tr>
              </thead>
              <tbody>
                {summary.campaigns.length === 0 ? (
                  <tr className="border-t">
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                      ไม่พบแคมเปญในวันนี้
                    </td>
                  </tr>
                ) : (
                  summary.campaigns.map((c: any, i: number) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-2">{c.platform}</td>
                      <td className="px-4 py-2">{c.campaignName}</td>
                      <td className="px-4 py-2">{c.spend.toFixed(2)}</td>
                      <td className="px-4 py-2">{c.clicks.toLocaleString()}</td>
                      <td className="px-4 py-2">{c.impressions.toLocaleString()}</td>
                      <td className="px-4 py-2">{c.conversions.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
