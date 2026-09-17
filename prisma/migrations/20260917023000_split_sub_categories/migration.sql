-- Add main category icon support
ALTER TABLE "categories" ADD COLUMN "icon" TEXT;

-- CreateTable
CREATE TABLE "sub_categories" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_categories_pkey" PRIMARY KEY ("id")
);

-- Preserve any category rows that were previously modeled as children.
INSERT INTO "sub_categories" (
    "id",
    "categoryId",
    "name",
    "slug",
    "description",
    "isActive",
    "isDeleted",
    "deletedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "parentId",
    "name",
    "slug",
    "description",
    "isActive",
    "isDeleted",
    "deletedAt",
    "createdAt",
    "updatedAt"
FROM "categories"
WHERE "parentId" IS NOT NULL;

DELETE FROM "categories" WHERE "parentId" IS NOT NULL;

-- Remove old self-relation hierarchy and sort ordering from main categories.
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_parentId_fkey";
DROP INDEX IF EXISTS "categories_parentId_idx";
ALTER TABLE "categories" DROP COLUMN IF EXISTS "parentId";
ALTER TABLE "categories" DROP COLUMN IF EXISTS "sortOrder";

-- CreateIndex
CREATE UNIQUE INDEX "sub_categories_categoryId_slug_key" ON "sub_categories"("categoryId", "slug");

-- CreateIndex
CREATE INDEX "sub_categories_categoryId_idx" ON "sub_categories"("categoryId");

-- CreateIndex
CREATE INDEX "sub_categories_isActive_isDeleted_idx" ON "sub_categories"("isActive", "isDeleted");

-- AddForeignKey
ALTER TABLE "sub_categories" ADD CONSTRAINT "sub_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
