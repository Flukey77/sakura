// scripts/backfill-customers.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const DRY = process.env.DRY_RUN === "1";

  const distinct = await prisma.sale.findMany({
    where: { customer: { not: null } },
    select: { customer: true },
    distinct: ["customer"],
  });

  const names = distinct
    .map(x => (x.customer ?? "").trim())
    .filter(Boolean);

  console.log(`ต้อง backfill ลูกค้า: ${names.length} ชื่อ`);

  for (const name of names) {
    let cust = await prisma.customer.findFirst({ where: { name } });
    if (!cust) {
      if (DRY) {
        console.log(`[DRY] create Customer: ${name}`);
      } else {
        cust = await prisma.customer.create({ data: { name, tags: [] } });
        console.log(`สร้าง Customer: ${name} -> ${cust.id}`);
      }
    } else {
      console.log(`พบลูกค้าแล้ว: ${name} -> ${cust.id}`);
    }

    if (!DRY && cust) {
      const res = await prisma.sale.updateMany({
        where: { customer: name, customerId: null },
        data: { customerId: cust.id },
      });
      console.log(`อัปเดต Sale ผูก customerId (${name}): ${res.count} แถว`);
    } else if (DRY) {
      console.log(`[DRY] updateMany Sale where customer="${name}" AND customerId IS NULL`);
    }
  }

  console.log("Backfill เสร็จ ✅");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
