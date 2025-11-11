// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

/**
 * ทำให้ Prisma เป็น singleton ระหว่าง HMR ของ Next.js (โหมด dev)
 * เพื่อกัน "Too many Prisma Clients" และ memory leak
 */
declare global {
  // eslint-disable-next-line no-var
  var __PRISMA_CLIENT__: PrismaClient | undefined;
}

function createClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });
}

const prisma: PrismaClient = global.__PRISMA_CLIENT__ ?? createClient();

// เก็บไว้บน global เวลาอยู่ใน dev เพื่อใช้ซ้ำ
if (process.env.NODE_ENV !== "production") {
  global.__PRISMA_CLIENT__ = prisma;
}

export default prisma;
export { prisma };
