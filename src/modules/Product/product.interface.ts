import { DiscountType, StockStatus } from "@prisma/client";

export type TProductVariantPayload = {
  id?: string;
  sku?: string;
  color?: string;
  size?: string;
  weight?: string;
  price?: number; // Variant Selling Price
  costPrice?: number; // Variant Purchase Price
  originalPrice?: number;
  stock?: number;
  image?: string;
  imageKey?: string;
};


export type TCreateProductPayload = {
  name: string;
  price: number;
  originalPrice?: number;
  costPrice?: number;
  stock?: number;
  lowStockThreshold?: number;
  stockStatus?: StockStatus;

  // Storefront Badge
  showStorefrontBadge?: boolean;
  storefrontBadgeText?: string;

  // Special Voucher / Promo
  hasVoucher?: boolean;
  voucherDiscountType?: DiscountType;
  voucherDiscountValue?: number;
  voucherCouponCode?: string;
  showVoucherBadge?: boolean;

  // Taxonomy
  categoryId: string;
  subCategoryId?: string;
  brandId?: string;

  // Details
  shortDescription?: string;
  description?: string;
  specifications?: Record<string, any>;
  warranty?: string;

  // SEO Fields
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;

  // Variants
  hasVariants?: boolean;
  variants?: TProductVariantPayload[];

  // Media URLs
  thumbnailUrl?: string;
  imageUrls?: string[];

  // Flags
  isFeatured?: boolean;
  isFlashDeal?: boolean;
  isActive?: boolean;
};

export type TUpdateProductPayload = Partial<TCreateProductPayload> & {
  removeThumbnail?: boolean;
  removeImageIds?: string[];
};

export type TProductFilterRequest = {
  searchTerm?: string;
  categoryId?: string;
  subCategoryId?: string;
  brandId?: string;
  minPrice?: string | number;
  maxPrice?: string | number;
  hasVoucher?: string | boolean;
  showStorefrontBadge?: string | boolean;
  isFeatured?: string | boolean;
  isFlashDeal?: string | boolean;
  isActive?: string | boolean;
  stockStatus?: StockStatus;
  hasVariants?: string | boolean;
  stockFilter?: string;
  minStock?: string | number;
  maxStock?: string | number;
};
