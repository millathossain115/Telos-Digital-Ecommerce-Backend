import { z } from "zod";
import { DiscountType, StockStatus } from "@prisma/client";

const optionalBoolean = z.preprocess((value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "1") return true;
  if (value === "0") return false;
  return value;
}, z.boolean().optional());

const optionalString = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) return undefined;
  return value;
}, z.string().trim().optional());

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) return undefined;
  if (typeof value === "string") {
    const num = Number(value);
    return isNaN(num) ? value : num;
  }
  return value;
}, z.number().optional());

const requiredNumber = (field: string) =>
  z.preprocess((value) => {
    if (typeof value === "string") {
      const num = Number(value);
      return isNaN(num) ? value : num;
    }
    return value;
  }, z.number({ required_error: `${field} is required` }).min(0));

const optionalJson = z.preprocess((value) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}, z.record(z.any()).optional());

const optionalVariants = z.preprocess((value) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}, z.array(
  z.object({
    id: z.string().optional(),
    color: optionalString,
    size: optionalString,
    weight: optionalString,
    price: optionalNumber,
    costPrice: optionalNumber,
    originalPrice: optionalNumber,
    stock: optionalNumber,
    image: optionalString,
  })
).optional());


const optionalRemoveImageIds = z.preprocess((value) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return [value];
    }
  }
  return value;
}, z.array(z.string()).optional());

const createProductValidationSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Product name is required" }).trim().min(2),
    price: requiredNumber("Price"),
    originalPrice: optionalNumber,
    costPrice: optionalNumber,
    stock: optionalNumber,
    lowStockThreshold: optionalNumber,
    stockStatus: z.nativeEnum(StockStatus).optional(),

    // Storefront Badge
    showStorefrontBadge: optionalBoolean,
    storefrontBadgeText: optionalString,

    // Voucher / Promo Ribbon
    hasVoucher: optionalBoolean,
    voucherDiscountType: z.nativeEnum(DiscountType).optional(),
    voucherDiscountValue: optionalNumber,
    voucherCouponCode: optionalString,
    showVoucherBadge: optionalBoolean,

    // Taxonomy
    categoryId: z.string({ required_error: "Category ID is required" }).uuid(),
    subCategoryId: optionalString,
    brandId: optionalString,

    // Details
    shortDescription: optionalString,
    description: optionalString,
    specifications: optionalJson,
    warranty: optionalString,

    // SEO Fields
    metaTitle: optionalString,
    metaDescription: optionalString,
    metaKeywords: optionalString,

    // Variants
    hasVariants: optionalBoolean,
    variants: optionalVariants,

    // Flags
    isFeatured: optionalBoolean,
    isFlashDeal: optionalBoolean,
    isActive: optionalBoolean,
  }),
});

const updateProductValidationSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).optional(),
    price: optionalNumber,
    originalPrice: optionalNumber,
    costPrice: optionalNumber,
    stock: optionalNumber,
    lowStockThreshold: optionalNumber,
    stockStatus: z.nativeEnum(StockStatus).optional(),

    // Storefront Badge
    showStorefrontBadge: optionalBoolean,
    storefrontBadgeText: optionalString,

    // Voucher / Promo Ribbon
    hasVoucher: optionalBoolean,
    voucherDiscountType: z.nativeEnum(DiscountType).optional(),
    voucherDiscountValue: optionalNumber,
    voucherCouponCode: optionalString,
    showVoucherBadge: optionalBoolean,

    // Taxonomy
    categoryId: optionalString,
    subCategoryId: optionalString,
    brandId: optionalString,

    // Details
    shortDescription: optionalString,
    description: optionalString,
    specifications: optionalJson,
    warranty: optionalString,

    // SEO Fields
    metaTitle: optionalString,
    metaDescription: optionalString,
    metaKeywords: optionalString,

    // Variants
    hasVariants: optionalBoolean,
    variants: optionalVariants,

    // Flags
    isFeatured: optionalBoolean,
    isFlashDeal: optionalBoolean,
    isActive: optionalBoolean,

    // Image mutations
    removeThumbnail: optionalBoolean,
    removeImageIds: optionalRemoveImageIds,
  }),
});

export const ProductValidation = {
  createProductValidationSchema,
  updateProductValidationSchema,
};
