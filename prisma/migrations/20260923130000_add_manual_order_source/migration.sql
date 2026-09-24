-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "OrderSource" AS ENUM ('WEBSITE', 'FACEBOOK', 'PHONE', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "source" "OrderSource" NOT NULL DEFAULT 'WEBSITE';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "createdByAdminId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "orders_source_idx" ON "orders"("source");
CREATE INDEX IF NOT EXISTS "orders_createdByAdminId_idx" ON "orders"("createdByAdminId");

-- AddForeignKey (only if not exists)
DO $$ BEGIN
  ALTER TABLE "orders" ADD CONSTRAINT "orders_createdByAdminId_fkey"
    FOREIGN KEY ("createdByAdminId") REFERENCES "admins"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
