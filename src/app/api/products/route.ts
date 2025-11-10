// src/app/api/products/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(products)
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      code: string
      name: string
      cost: number | string
      price: number | string
      stock?: number
    }

    if (!body.code || !body.name) {
      return NextResponse.json({ message: 'code/name required' }, { status: 400 })
    }

    const product = await prisma.product.create({
      data: {
        code: body.code.trim(),
        name: body.name.trim(),
        cost: String(body.cost ?? 0),
        price: String(body.price ?? 0),
        stock: Number(body.stock ?? 0),
      },
    })
    return NextResponse.json(product, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? 'error' }, { status: 500 })
  }
}

