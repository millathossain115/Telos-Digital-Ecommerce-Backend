UPDATE "customers"
SET "phone" = CONCAT('MISSING-', "id")
WHERE "phone" IS NULL OR BTRIM("phone") = '';

ALTER TABLE "customers" ALTER COLUMN "phone" SET NOT NULL;

CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");
