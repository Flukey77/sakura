import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "username ต้องยาวอย่างน้อย 3 ตัว")
    .max(50, "username ยาวเกินไป")
    .regex(/^[a-zA-Z0-9._-]+$/, "อนุญาตเฉพาะ a-z 0-9 . _ -"),
  password: z.string().min(6, "รหัสผ่านต้องยาวอย่างน้อย 6 ตัว"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = schema.parse(body);

    const existed = await prisma.user.findUnique({ where: { username } });
    if (existed) {
      return new Response(
        JSON.stringify({ error: "มี username นี้อยู่แล้ว" }),
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        username,
        hashedPassword,
        role: "USER",
      },
    });

    return new Response(JSON.stringify({ ok: true }), { status: 201 });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message ?? "เกิดข้อผิดพลาด" }),
      { status: 400 }
    );
  }
}
