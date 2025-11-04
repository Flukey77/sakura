import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function BillingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return <div>กรุณาเข้าสู่ระบบ</div>;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  const sub = await prisma.subscription.findUnique({
    where: { userId: user!.id },
  });

  // Server Action: สร้าง session แล้ว redirect ไป Stripe
  async function createSession() {
    "use server";

    const base =
      process.env.NEXTAUTH_URL || "http://localhost:3000";

    const res = await fetch(`${base}/api/stripe/create-checkout-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error("Failed to create checkout session");
    }

    const { url } = (await res.json()) as { url: string };
    redirect(url); // redirect ฝั่ง server ทันที
  }

  const label = sub?.status === "ACTIVE" ? "Manage on Stripe" : "Subscribe";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Billing</h1>

      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Subscription Status</p>
            <p className="text-lg font-medium">{sub?.status ?? "INACTIVE"}</p>
          </div>

          {/* ใช้ Server Action ผูกกับ form */}
          <form action={createSession}>
            <button
              type="submit"
              className="rounded bg-black text-white px-4 py-2"
            >
              {label}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
