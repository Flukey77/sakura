/*
  Warnings:

  - You are about to drop the column `cost` on the `SaleItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SaleItem" DROP COLUMN "cost",
ADD COLUMN     "cogs" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "costEach" DECIMAL(18,2) NOT NULL DEFAULT 0;
