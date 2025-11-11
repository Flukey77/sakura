/*
  Warnings:

  - The values [Facebook,TikTok] on the enum `AdChannel` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AdChannel_new" AS ENUM ('FACEBOOK', 'TIKTOK');
ALTER TABLE "AdSpendDaily" ALTER COLUMN "channel" TYPE "AdChannel_new" USING ("channel"::text::"AdChannel_new");
ALTER TYPE "AdChannel" RENAME TO "AdChannel_old";
ALTER TYPE "AdChannel_new" RENAME TO "AdChannel";
DROP TYPE "public"."AdChannel_old";
COMMIT;
