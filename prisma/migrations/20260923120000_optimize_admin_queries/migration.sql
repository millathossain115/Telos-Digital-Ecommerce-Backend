-- CreateIndex
CREATE INDEX "categories_isDeleted_createdAt_idx" ON "categories"("isDeleted", "createdAt");

-- CreateIndex
CREATE INDEX "categories_isDeleted_isActive_createdAt_idx" ON "categories"("isDeleted", "isActive", "createdAt");

-- CreateIndex
CREATE INDEX "brands_isDeleted_createdAt_idx" ON "brands"("isDeleted", "createdAt");

-- CreateIndex
CREATE INDEX "brands_isDeleted_isActive_createdAt_idx" ON "brands"("isDeleted", "isActive", "createdAt");

-- CreateIndex
CREATE INDEX "products_isDeleted_createdAt_idx" ON "products"("isDeleted", "createdAt");

-- CreateIndex
CREATE INDEX "products_isDeleted_isActive_createdAt_idx" ON "products"("isDeleted", "isActive", "createdAt");

-- CreateIndex
CREATE INDEX "products_categoryId_isDeleted_createdAt_idx" ON "products"("categoryId", "isDeleted", "createdAt");

-- CreateIndex
CREATE INDEX "products_subCategoryId_isDeleted_createdAt_idx" ON "products"("subCategoryId", "isDeleted", "createdAt");

-- CreateIndex
CREATE INDEX "products_brandId_isDeleted_createdAt_idx" ON "products"("brandId", "isDeleted", "createdAt");

-- CreateIndex
CREATE INDEX "orders_status_createdAt_idx" ON "orders"("status", "createdAt");

-- CreateIndex
CREATE INDEX "orders_paymentStatus_createdAt_idx" ON "orders"("paymentStatus", "createdAt");

-- CreateIndex
CREATE INDEX "orders_status_paymentStatus_createdAt_idx" ON "orders"("status", "paymentStatus", "createdAt");
