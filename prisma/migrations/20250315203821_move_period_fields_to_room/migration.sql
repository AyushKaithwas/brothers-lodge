/*
  Warnings:

  - You are about to drop the column `period_from` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `period_to` on the `tenants` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "period_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "period_to" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "tenants" DROP COLUMN "period_from",
DROP COLUMN "period_to";
