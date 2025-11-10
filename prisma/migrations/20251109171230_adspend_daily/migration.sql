/*
  Warnings:

  - The values [FACEBOOK,TIKTOK] on the enum `AdChannel` will be removed. If these variants are still used in the database, this will fail.
  - The values [REFUND] on the enum `PaymentStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AdChannel_new" AS ENUM ('Facebook', 'TikTok');
ALTER TABLE "AdSpendDaily" ALTER COLUMN "channel" TYPE "AdChannel_new" USING ("channel"::text::"AdChannel_new");
ALTER TYPE "AdChannel" RENAME TO "AdChannel_old";
ALTER TYPE "AdChannel_new" RENAME TO "AdChannel";
DROP TYPE "public"."AdChannel_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentStatus_new" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'REFUNDED', 'CANCELED');
ALTER TABLE "public"."Sale" ALTER COLUMN "paymentStatus" DROP DEFAULT;
ALTER TABLE "Sale" ALTER COLUMN "paymentStatus" TYPE "PaymentStatus_new" USING ("paymentStatus"::text::"PaymentStatus_new");
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "public"."PaymentStatus_old";
ALTER TABLE "Sale" ALTER COLUMN "paymentStatus" SET DEFAULT 'PENDING';
COMMIT;
