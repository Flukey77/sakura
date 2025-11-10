// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: 'up', env: process.env.NODE_ENV });
  } catch (e:any) {
    return NextResponse.json({ ok: false, db: 'down', error: e?.message }, { status: 500 });
  }
}

