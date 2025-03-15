/*
  Warnings:

  - You are about to drop the column `gram` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `jila` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `rent_amount` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `tehseel` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `thana` on the `tenants` table. All the data in the column will be lost.
*/

-- First, add the new columns allowing NULL
ALTER TABLE "tenants" ADD COLUMN "village_name" TEXT;
ALTER TABLE "tenants" ADD COLUMN "tehsil" TEXT;
ALTER TABLE "tenants" ADD COLUMN "police_station" TEXT;
ALTER TABLE "tenants" ADD COLUMN "district" TEXT;

-- Copy data from old columns to new ones
UPDATE "tenants" SET 
  "village_name" = "gram",
  "tehsil" = "tehseel",
  "police_station" = "thana",
  "district" = "jila";

-- Add the rent_amount column to rooms
ALTER TABLE "rooms" ADD COLUMN "rent_amount" INTEGER NOT NULL DEFAULT 0;

-- Copy rent_amount from tenants to rooms for existing data
-- We'll use the first tenant's rent_amount for each room
WITH first_tenants AS (
  SELECT DISTINCT ON (room_id) 
    room_id, 
    rent_amount
  FROM tenants
  ORDER BY room_id, id
)
UPDATE rooms
SET rent_amount = ft.rent_amount
FROM first_tenants ft
WHERE rooms.id = ft.room_id;

-- Now make the new columns NOT NULL
ALTER TABLE "tenants" ALTER COLUMN "village_name" SET NOT NULL;
ALTER TABLE "tenants" ALTER COLUMN "tehsil" SET NOT NULL;
ALTER TABLE "tenants" ALTER COLUMN "police_station" SET NOT NULL;
ALTER TABLE "tenants" ALTER COLUMN "district" SET NOT NULL;

-- Finally drop the old columns
ALTER TABLE "tenants" DROP COLUMN "gram";
ALTER TABLE "tenants" DROP COLUMN "tehseel";
ALTER TABLE "tenants" DROP COLUMN "thana";
ALTER TABLE "tenants" DROP COLUMN "jila";
ALTER TABLE "tenants" DROP COLUMN "rent_amount";
