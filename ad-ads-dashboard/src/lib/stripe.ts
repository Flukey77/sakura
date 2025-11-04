// src/lib/stripe.ts
import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe() {
  if (stripe) return stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    // ระหว่าง build จะยังไม่มี key — อย่า new ที่นี่
    // ให้โยน error เมื่อ "ถูกเรียกใช้จริง" เท่านั้น
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  stripe = new Stripe(key);
  return stripe;
}
