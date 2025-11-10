// src/app/api/register/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";               // ✅ ใช้ path แบบเดียวกับไฟล์อื่น
import { hashPassword, isValidSignupCode } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const { username, password, name, signupCode } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
    }
    if (!isValidSignupCode(signupCode)) {
      return NextResponse.json({ error: "SIGNUP CODE ไม่ถูกต้อง" }, { status: 403 });
    }

    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) {
      return NextResponse.json({ error: "มี username นี้แล้ว" }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: { username, password: await hashPassword(password), name },
      select: { id: true },
    });

    // ✅ สำเร็จ ส่ง ok:true ให้ฝั่ง client เป็นคน redirect
    return NextResponse.json({ ok: true, id: user.id }, { status: 201 });
  } catch (e) {
    console.error("REGISTER_ERROR:", e);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// (ตัวเลือก) สำหรับเทส GET
export async function GET() {
  return new Response("register-ok-get");
}

