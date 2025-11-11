import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    throw NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return session;
}

/** GET /api/admin/users/:id */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, username: true, name: true, role: true, createdAt: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch (e: any) {
    if (e?.status) return e;
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

/** PATCH /api/admin/users/:id – แก้ role/ชื่อ/รหัสผ่าน */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => ({} as any));
    const { role, name, password } = body || {};
    const data: any = {};

    if (typeof role === "string") {
      const r = role.toUpperCase();
      if (!["ADMIN", "EMPLOYEE"].includes(r)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      data.role = r;
    }
    if (typeof name === "string") data.name = name || null;
    if (typeof password === "string" && password.trim()) {
      data.password = await bcrypt.hash(password, 10);
    }

    if (!Object.keys(data).length) {
      return NextResponse.json({ error: "No changes" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, username: true, name: true, role: true, createdAt: true },
    });
    return NextResponse.json({ ok: true, user: updated });
  } catch (e: any) {
    if (e?.status) return e;
    return NextResponse.json({ error: e?.message ?? "Update failed" }, { status: 500 });
  }
}

/** DELETE /api/admin/users/:id */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin();
    const selfId = (session.user as any)?.id;
    if (selfId === params.id) {
      return NextResponse.json({ error: "You cannot delete yourself" }, { status: 400 });
    }
    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status) return e;
    return NextResponse.json({ error: e?.message ?? "Delete failed" }, { status: 404 });
  }
}
