// src/app/api/stripe/webhook/route.ts
import { headers } from "next/headers";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// ประกาศครั้งเดียวพอ (ไว้ด้านบนไฟล์)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sig = headers().get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  const whSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  if (!whSecret) {
    return new Response("Missing STRIPE_WEBHOOK_SECRET", { status: 500 });
  }

  const raw = await req.text();

  // ใช้ instance ต่อ request
  const stripe = getStripe();

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, whSecret);
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const obj = event.data.object;

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated"
  ) {
    const subId = obj.id as string;
    const status = (obj.status as string).toUpperCase(); // ACTIVE, PAST_DUE, CANCELED
    const currentPeriodEnd = new Date((obj.current_period_end as number) * 1000);
    const customerId = obj.customer as string;
    const priceId = obj.items?.data?.[0]?.price?.id as string | undefined;

    // หา user จาก customerId ในตาราง Subscription
    const sub = await prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (sub) {
      await prisma.subscription.update({
        where: { userId: sub.userId },
        data: {
          stripeSubscriptionId: subId,
          status: status as any,
          currentPeriodEnd,
          stripePriceId: priceId,
        },
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subId = obj.id as string;
    const sub = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subId },
    });

    if (sub) {
      await prisma.subscription.update({
        where: { userId: sub.userId },
        data: { status: "CANCELED" as any },
      });
    }
  }

  return new Response("ok", { status: 200 });
}
