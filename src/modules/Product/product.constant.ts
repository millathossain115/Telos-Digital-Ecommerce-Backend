export const productSearchableFields = [
  "name",
  "sku",
  "shortDescription",
  "voucherCouponCode",
  "storefrontBadgeText",
];

export const productFilterableFields = [
  "searchTerm",
  "categoryId",
  "subCategoryId",
  "brandId",
  "minPrice",
  "maxPrice",
  "hasVoucher",
  "showStorefrontBadge",
  "isFeatured",
  "isFlashDeal",
  "isActive",
  "stockStatus",
  "hasVariants",
];

export const productSortableFields = [
  "price",
  "createdAt",
  "name",
  "stock",
  "updatedAt",
];

export const PRODUCT_IMAGE_FOLDER = "products";

export const PRODUCT_IMAGE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];
