// src/app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";        // << ใช้จาก lib
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // กัน cache dev

function isAdmin(session: any) {
  return !!session && (session.user as any)?.role === "ADMIN";
}

/** GET /api/admin/users -> คืน array ของผู้ใช้ */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, username: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

/** POST /api/admin/users -> สร้างผู้ใช้ */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({} as any));
  const { username, password, name, role } = body || {};

  if (!username || !password) {
    return NextResponse.json({ error: "username/password required" }, { status: 400 });
  }

  const exist = await prisma.user.findUnique({ where: { username } });
  if (exist) {
    return NextResponse.json({ error: "Username already exists" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      username,
      password: hashed,
      name: name || null,
      role: role === "ADMIN" ? "ADMIN" : "EMPLOYEE",
    },
    select: { id: true, username: true, name: true, role: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, user }, { status: 201 });
}

