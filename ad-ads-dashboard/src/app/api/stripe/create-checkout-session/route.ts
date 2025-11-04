// src/app/api/stripe/create-checkout-session/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });

  let sub = await prisma.subscription.findUnique({ where: { userId: user.id } });

  // เตรียม Stripe instance (ผูกตาม runtime)
  const stripe = getStripe();

  // เตรียม customer
  let customerId = sub?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
    });
    customerId = customer.id;

    if (sub) {
      await prisma.subscription.update({
        where: { userId: user.id },
        data: { stripeCustomerId: customerId },
      });
    } else {
      sub = await prisma.subscription.create({
        data: { userId: user.id, stripeCustomerId: customerId },
      });
    }
  }

  const priceId = process.env.STRIPE_PRICE_ID!;
  const successUrl = process.env.STRIPE_SUCCESS_URL!;
  const cancelUrl = process.env.STRIPE_CANCEL_URL!;

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return new Response(JSON.stringify({ url: checkout.url }), { status: 200 });
}
