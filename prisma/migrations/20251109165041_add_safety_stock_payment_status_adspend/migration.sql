-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'REFUND');

-- CreateEnum
CREATE TYPE "AdChannel" AS ENUM ('FACEBOOK', 'TIKTOK');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "safetyStock" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "AdSpendDaily" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "channel" "AdChannel" NOT NULL,
    "campaignName" TEXT,
    "adsetName" TEXT,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdSpendDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdSpendDaily_date_channel_idx" ON "AdSpendDaily"("date", "channel");
