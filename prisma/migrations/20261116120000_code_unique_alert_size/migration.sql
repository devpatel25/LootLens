-- Alert.size: add nullable, backfill from the linked watch, then require it.
ALTER TABLE "Alert" ADD COLUMN "size" TEXT;
UPDATE "Alert" SET "size" = "Watch"."size" FROM "Watch" WHERE "Alert"."watchId" = "Watch"."id";
UPDATE "Alert" SET "size" = '' WHERE "size" IS NULL;
ALTER TABLE "Alert" ALTER COLUMN "size" SET NOT NULL;

-- Code: one row per store and code text.
CREATE UNIQUE INDEX "Code_storeId_code_key" ON "Code"("storeId", "code");
