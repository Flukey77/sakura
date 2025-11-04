import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";


const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN?.toLowerCase();

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { name, email, password } = schema.parse(json);
    const lower = email.toLowerCase().trim();

    if (allowedDomain && !lower.endsWith(`@${allowedDomain}`)) {
      return new Response(JSON.stringify({ error: `อนุญาตเฉพาะโดเมน @${allowedDomain}` }), { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { email: lower } });
    if (exists) {
      return new Response(JSON.stringify({ error: "อีเมลนี้ถูกใช้แล้ว" }), { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { name, email: lower, hashedPassword },
    });

    return new Response(JSON.stringify({ ok: true }), { status: 201 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "เกิดข้อผิดพลาด" }), { status: 400 });
  }
}
