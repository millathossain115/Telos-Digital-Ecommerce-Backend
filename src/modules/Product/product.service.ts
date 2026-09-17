import { Prisma, StockStatus } from "@prisma/client";
import httpStatus from "http-status";
import path from "path";
import config from "../../config";
import AppError from "../../errors/AppError";
import {
  deletePrivateObject,
  getPrivateObjectSignedUrl,
  uploadPrivateObject,
} from "../../lib/r2";
import prisma from "../../lib/prisma";
import {
  buildSearchFilter,
  buildSortOrder,
  ISortOptions,
} from "../../shared/filterHelper";
import {
  buildPaginationMeta,
  calculatePagination,
  IPaginationOptions,
} from "../../shared/paginationHelper";
import {
  PRODUCT_IMAGE_FOLDER,
  productSearchableFields,
  productSortableFields,
} from "./product.constant";
import {
  TCreateProductPayload,
  TProductFilterRequest,
  TUpdateProductPayload,
} from "./product.interface";

const productInclude = {
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
    },
  },
  subCategory: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  brand: {
    select: {
      id: true,
      name: true,
      slug: true,
      image: true,
    },
  },
  images: {
    orderBy: { order: "asc" as const },
  },
  variants: {
    where: { isDeleted: false },
    orderBy: { createdAt: "asc" as const },
  },
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

const createUniqueProductSlug = async (name: string, excludeId?: string) => {
  const baseSlug = slugify(name) || "product";
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing || existing.id === excludeId) return slug;

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
};

const generateProductSku = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  let isUnique = false;
  let sku = "";
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts++;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    sku = `TC-PRD-${currentYear}-${randomSuffix}`;
    const existing = await prisma.product.findUnique({
      where: { sku },
      select: { id: true },
    });
    if (!existing) isUnique = true;
  }

  return isUnique ? sku : `TC-PRD-${currentYear}-${Date.now().toString().slice(-4)}`;
};

const getPublicImageUrl = (key: string) => {
  if (!config.r2.public_base_url) return key;
  return `${config.r2.public_base_url.replace(/\/$/, "")}/${key}`;
};

const withDisplayImageUrl = async <T extends { thumbnailKey?: string | null; thumbnail?: string | null; images?: any[] }>(
  product: T,
): Promise<T> => {
  let displayThumbnail = product.thumbnail;

  if (product.thumbnailKey) {
    if (config.r2.public_base_url) {
      displayThumbnail = getPublicImageUrl(product.thumbnailKey);
    } else {
      try {
        displayThumbnail = await getPrivateObjectSignedUrl(product.thumbnailKey);
      } catch {
        displayThumbnail = product.thumbnail;
      }
    }
  }

  let formattedImages = product.images;
  if (product.images && product.images.length > 0) {
    formattedImages = await Promise.all(
      product.images.map(async (img) => {
        if (!img.key) return img;
        if (config.r2.public_base_url) {
          return { ...img, url: getPublicImageUrl(img.key) };
        }
        try {
          const signed = await getPrivateObjectSignedUrl(img.key);
          return { ...img, url: signed };
        } catch {
          return img;
        }
      }),
    );
  }

  return {
    ...product,
    thumbnail: displayThumbnail,
    images: formattedImages,
  };
};

const uploadFileToR2 = async (
  file: Express.Multer.File,
  prefix: string,
) => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ext = path.extname(file.originalname).toLowerCase();
  const uniqueId = crypto.randomUUID();
  const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 50);
  const key = `${PRODUCT_IMAGE_FOLDER}/${year}/${month}/${prefix}-${uniqueId}-${safeName}${ext}`;

  await uploadPrivateObject({
    key,
    body: file.buffer,
    contentType: file.mimetype,
    metadata: {
      originalName: file.originalname,
      uploadedAt: now.toISOString(),
    },
  });

  return {
    key,
    url: getPublicImageUrl(key),
  };
};

// ==================== CREATE PRODUCT ====================
const createProduct = async (
  payload: TCreateProductPayload,
  files?: {
    thumbnail?: Express.Multer.File[];
    images?: Express.Multer.File[];
  },
) => {
  // 1. Validate Category
  const category = await prisma.category.findFirst({
    where: { id: payload.categoryId, isDeleted: false },
  });
  if (!category) {
    throw new AppError(httpStatus.BAD_REQUEST, "Category does not exist or is deleted");
  }

  // 2. Validate SubCategory (if provided)
  if (payload.subCategoryId) {
    const subCategory = await prisma.subCategory.findFirst({
      where: {
        id: payload.subCategoryId,
        categoryId: payload.categoryId,
        isDeleted: false,
      },
    });
    if (!subCategory) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Subcategory does not exist or does not belong to the selected category",
      );
    }
  }

  // 3. Validate Brand (if provided)
  if (payload.brandId) {
    const brand = await prisma.brand.findFirst({
      where: { id: payload.brandId, isDeleted: false },
    });
    if (!brand) {
      throw new AppError(httpStatus.BAD_REQUEST, "Brand does not exist or is deleted");
    }
  }

  // 4. Generate unique Slug & SKU
  const slug = await createUniqueProductSlug(payload.name);
  const sku = await generateProductSku();

  // 5. Handle Image Uploads
  let thumbnailData: { key: string; url: string } | null = null;
  const galleryImagesData: { key: string; url: string; order: number }[] = [];

  if (files?.thumbnail?.[0]) {
    thumbnailData = await uploadFileToR2(files.thumbnail[0], "thumb");
  }

  if (files?.images && files.images.length > 0) {
    for (let i = 0; i < files.images.length; i++) {
      const uploaded = await uploadFileToR2(files.images[i], `gal-${i + 1}`);
      galleryImagesData.push({
        ...uploaded,
        order: i,
      });
    }
    // If no explicit thumbnail was provided, make the first gallery image the thumbnail
    if (!thumbnailData && galleryImagesData.length > 0) {
      thumbnailData = {
        key: galleryImagesData[0].key,
        url: galleryImagesData[0].url,
      };
    }
  }

  // 6. Calculate Variants & Stock
  const hasVariants = Boolean(payload.hasVariants && payload.variants && payload.variants.length > 0);
  let totalStock = payload.stock ?? 0;

  if (hasVariants && payload.variants) {
    totalStock = payload.variants.reduce((acc, v) => acc + (v.stock || 0), 0);
  }

  const stockStatus =
    payload.stockStatus ||
    (totalStock <= 0
      ? StockStatus.OUT_OF_STOCK
      : totalStock <= (payload.lowStockThreshold || 5)
        ? StockStatus.LOW_STOCK
        : StockStatus.IN_STOCK);

  // 7. Database Creation Transaction
  const created = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name: payload.name,
        slug,
        sku,
        price: new Prisma.Decimal(payload.price),
        originalPrice: payload.originalPrice ? new Prisma.Decimal(payload.originalPrice) : null,
        costPrice: payload.costPrice ? new Prisma.Decimal(payload.costPrice) : null,
        stock: totalStock,
        lowStockThreshold: payload.lowStockThreshold ?? 5,
        stockStatus,

        // Storefront Badge
        showStorefrontBadge: payload.showStorefrontBadge ?? false,
        storefrontBadgeText: payload.storefrontBadgeText || null,

        // Voucher / Promo
        hasVoucher: payload.hasVoucher ?? false,
        voucherDiscountType: payload.voucherDiscountType || null,
        voucherDiscountValue: payload.voucherDiscountValue
          ? new Prisma.Decimal(payload.voucherDiscountValue)
          : null,
        voucherCouponCode: payload.voucherCouponCode || null,
        showVoucherBadge: payload.showVoucherBadge ?? false,

        // Taxonomy
        categoryId: payload.categoryId,
        subCategoryId: payload.subCategoryId || null,
        brandId: payload.brandId || null,

        // Details
        shortDescription: payload.shortDescription || null,
        description: payload.description || null,
        specifications: payload.specifications ? (payload.specifications as Prisma.InputJsonValue) : Prisma.JsonNull,
        warranty: payload.warranty || null,

        // SEO
        metaTitle: payload.metaTitle || null,
        metaDescription: payload.metaDescription || null,
        metaKeywords: payload.metaKeywords || null,

        // Media
        thumbnail: thumbnailData?.url || null,
        thumbnailKey: thumbnailData?.key || null,

        // Flags
        hasVariants,
        isFeatured: payload.isFeatured ?? false,
        isFlashDeal: payload.isFlashDeal ?? false,
        isActive: payload.isActive ?? true,

        // Gallery Images relation
        images: {
          create: galleryImagesData.map((img) => ({
            url: img.url,
            key: img.key,
            order: img.order,
            isThumbnail: thumbnailData?.key === img.key,
          })),
        },

        // Variants relation
        variants: hasVariants && payload.variants
          ? {
              create: payload.variants.map((v) => {
                const colorCode = v.color ? slugify(v.color).toUpperCase() : "";
                const sizeCode = v.size ? slugify(v.size).toUpperCase() : "";
                const weightCode = v.weight ? slugify(v.weight).toUpperCase() : "";
                const codes = [colorCode, sizeCode, weightCode].filter(Boolean);
                const variantSku = codes.length > 0 ? `${sku}-${codes.join("-")}` : `${sku}-VAR`;

                return {
                  sku: variantSku,
                  color: v.color || null,
                  size: v.size || null,
                  weight: v.weight || null,
                  price: v.price ? new Prisma.Decimal(v.price) : null,
                  costPrice: v.costPrice ? new Prisma.Decimal(v.costPrice) : null,
                  originalPrice: v.originalPrice ? new Prisma.Decimal(v.originalPrice) : null,
                  stock: v.stock ?? 0,
                  image: v.image || null,
                  imageKey: v.imageKey || null,
                };
              }),
            }
          : undefined,

      },
      include: productInclude,
    });

    return product;
  });

  return withDisplayImageUrl(created);
};

// ==================== GET ALL PRODUCTS (PUBLIC) ====================
const getAllProducts = async (
  filters: TProductFilterRequest,
  paginationOptions: IPaginationOptions,
  sortOptions: ISortOptions,
) => {
  const { page, limit, skip } = calculatePagination(paginationOptions);
  const andConditions: Prisma.ProductWhereInput[] = [
    { isDeleted: false },
    { isActive: true },
  ];

  // Search by keyword
  const searchFilter = buildSearchFilter(filters.searchTerm, productSearchableFields);
  if (searchFilter) {
    andConditions.push(searchFilter);
  }

  // Category filter
  if (filters.categoryId) {
    andConditions.push({ categoryId: filters.categoryId });
  }

  // SubCategory filter
  if (filters.subCategoryId) {
    andConditions.push({ subCategoryId: filters.subCategoryId });
  }

  // Brand filter
  if (filters.brandId) {
    andConditions.push({ brandId: filters.brandId });
  }

  // Price range filters
  if (filters.minPrice !== undefined && filters.minPrice !== "") {
    andConditions.push({ price: { gte: new Prisma.Decimal(Number(filters.minPrice)) } });
  }
  if (filters.maxPrice !== undefined && filters.maxPrice !== "") {
    andConditions.push({ price: { lte: new Prisma.Decimal(Number(filters.maxPrice)) } });
  }

  // Boolean flags
  if (filters.isFeatured !== undefined && filters.isFeatured !== "") {
    andConditions.push({ isFeatured: filters.isFeatured === true || filters.isFeatured === "true" });
  }
  if (filters.isFlashDeal !== undefined && filters.isFlashDeal !== "") {
    andConditions.push({ isFlashDeal: filters.isFlashDeal === true || filters.isFlashDeal === "true" });
  }
  if (filters.hasVoucher !== undefined && filters.hasVoucher !== "") {
    andConditions.push({ hasVoucher: filters.hasVoucher === true || filters.hasVoucher === "true" });
  }
  if (filters.stockStatus) {
    andConditions.push({ stockStatus: filters.stockStatus });
  }

  const whereConditions: Prisma.ProductWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const orderBy = buildSortOrder(sortOptions, productSortableFields, "createdAt", "desc");


  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      include: productInclude,
    }),
    prisma.product.count({ where: whereConditions }),
  ]);

  const data = await Promise.all(products.map(withDisplayImageUrl));

  return {
    meta: buildPaginationMeta(page, limit, total),
    data,
  };
};

// ==================== GET ALL PRODUCTS (ADMIN) ====================
const getAllProductsAdmin = async (
  filters: TProductFilterRequest,
  paginationOptions: IPaginationOptions,
  sortOptions: ISortOptions,
) => {
  const { page, limit, skip } = calculatePagination(paginationOptions);
  const andConditions: Prisma.ProductWhereInput[] = [{ isDeleted: false }];

  const searchFilter = buildSearchFilter(filters.searchTerm, productSearchableFields);
  if (searchFilter) {
    andConditions.push(searchFilter);
  }

  if (filters.categoryId) {
    andConditions.push({ categoryId: filters.categoryId });
  }
  if (filters.subCategoryId) {
    andConditions.push({ subCategoryId: filters.subCategoryId });
  }
  if (filters.brandId) {
    andConditions.push({ brandId: filters.brandId });
  }
  if (filters.isActive !== undefined && filters.isActive !== "") {
    andConditions.push({ isActive: filters.isActive === true || filters.isActive === "true" });
  }
  if (filters.stockStatus) {
    andConditions.push({ stockStatus: filters.stockStatus });
  }
  if (filters.isFeatured !== undefined && filters.isFeatured !== "") {
    andConditions.push({ isFeatured: filters.isFeatured === true || filters.isFeatured === "true" });
  }
  if (filters.isFlashDeal !== undefined && filters.isFlashDeal !== "") {
    andConditions.push({ isFlashDeal: filters.isFlashDeal === true || filters.isFlashDeal === "true" });
  }

  const whereConditions: Prisma.ProductWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const orderBy = buildSortOrder(sortOptions, productSortableFields, "createdAt", "desc");


  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      include: productInclude,
    }),
    prisma.product.count({ where: whereConditions }),
  ]);

  const data = await Promise.all(products.map(withDisplayImageUrl));

  return {
    meta: buildPaginationMeta(page, limit, total),
    data,
  };
};

// ==================== GET PRODUCT BY SLUG ====================
const getProductBySlug = async (slugOrId: string) => {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
  const product = await prisma.product.findFirst({
    where: {
      ...(isUuid
        ? { OR: [{ id: slugOrId }, { slug: slugOrId }] }
        : { slug: slugOrId }),
      isDeleted: false,
    },
    include: productInclude,
  });

  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, "Product not found or unavailable");
  }

  return withDisplayImageUrl(product);
};

// ==================== GET PRODUCT BY ID ====================
const getProductById = async (id: string) => {
  const product = await prisma.product.findFirst({
    where: { id, isDeleted: false },
    include: productInclude,
  });

  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, "Product not found");
  }

  return withDisplayImageUrl(product);
};

// ==================== UPDATE PRODUCT ====================
const updateProduct = async (
  id: string,
  payload: TUpdateProductPayload,
  files?: {
    thumbnail?: Express.Multer.File[];
    images?: Express.Multer.File[];
  },
) => {
  const existing = await prisma.product.findFirst({
    where: { id, isDeleted: false },
    include: { images: true, variants: true },
  });

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Product not found");
  }

  // 1. Slug regeneration if name changed
  let slug = existing.slug;
  if (payload.name && payload.name.trim() !== existing.name) {
    slug = await createUniqueProductSlug(payload.name, existing.id);
  }

  // 2. Validate Category/SubCategory/Brand if modified
  if (payload.categoryId && payload.categoryId !== existing.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: payload.categoryId, isDeleted: false },
    });
    if (!category) {
      throw new AppError(httpStatus.BAD_REQUEST, "Category does not exist or is deleted");
    }
  }

  const categoryId = payload.categoryId || existing.categoryId;
  if (payload.subCategoryId && payload.subCategoryId !== existing.subCategoryId) {
    const subCategory = await prisma.subCategory.findFirst({
      where: {
        id: payload.subCategoryId,
        categoryId,
        isDeleted: false,
      },
    });
    if (!subCategory) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Subcategory does not exist or does not belong to the selected category",
      );
    }
  }

  if (payload.brandId && payload.brandId !== existing.brandId) {
    const brand = await prisma.brand.findFirst({
      where: { id: payload.brandId, isDeleted: false },
    });
    if (!brand) {
      throw new AppError(httpStatus.BAD_REQUEST, "Brand does not exist or is deleted");
    }
  }

  // 3. Handle Thumbnail Update / Removal
  let thumbnail = existing.thumbnail;
  let thumbnailKey = existing.thumbnailKey;

  if (payload.removeThumbnail && thumbnailKey) {
    try {
      await deletePrivateObject(thumbnailKey);
    } catch {
      // Non-blocking
    }
    thumbnail = null;
    thumbnailKey = null;
  }

  if (files?.thumbnail?.[0]) {
    if (thumbnailKey) {
      try {
        await deletePrivateObject(thumbnailKey);
      } catch {
        // Non-blocking
      }
    }
    const uploadedThumb = await uploadFileToR2(files.thumbnail[0], "thumb");
    thumbnail = uploadedThumb.url;
    thumbnailKey = uploadedThumb.key;
  }

  // 4. Handle Gallery Images Removal
  if (payload.removeImageIds && payload.removeImageIds.length > 0) {
    const imagesToRemove = existing.images.filter((img) =>
      payload.removeImageIds!.includes(img.id),
    );
    for (const img of imagesToRemove) {
      if (img.key) {
        try {
          await deletePrivateObject(img.key);
        } catch {
          // Non-blocking
        }
      }
      await prisma.productImage.delete({ where: { id: img.id } });
    }
  }

  // 5. Handle New Gallery Images Upload
  const newGalleryImages: { key: string; url: string; order: number }[] = [];
  if (files?.images && files.images.length > 0) {
    const existingMaxOrder = existing.images.reduce((max, img) => Math.max(max, img.order), 0);
    for (let i = 0; i < files.images.length; i++) {
      const uploaded = await uploadFileToR2(files.images[i], `gal-${i + 1}`);
      newGalleryImages.push({
        ...uploaded,
        order: existingMaxOrder + i + 1,
      });
    }
  }

  // 6. Handle Variants & Stock
  let hasVariants = payload.hasVariants !== undefined ? payload.hasVariants : existing.hasVariants;
  let totalStock = payload.stock !== undefined ? payload.stock : existing.stock;

  if (payload.variants && payload.variants.length > 0) {
    hasVariants = true;
    totalStock = payload.variants.reduce((acc, v) => acc + (v.stock || 0), 0);
  }

  const stockStatus =
    payload.stockStatus ||
    (totalStock <= 0
      ? StockStatus.OUT_OF_STOCK
      : totalStock <= (payload.lowStockThreshold || existing.lowStockThreshold)
        ? StockStatus.LOW_STOCK
        : StockStatus.IN_STOCK);

  // 7. Update Transaction
  const updated = await prisma.$transaction(async (tx) => {
    // If variants were provided, replace or update
    if (payload.variants && payload.variants.length > 0) {
      await tx.productVariant.deleteMany({ where: { productId: id } });
      await tx.productVariant.createMany({
        data: payload.variants.map((v) => {
          const colorCode = v.color ? slugify(v.color).toUpperCase() : "";
          const sizeCode = v.size ? slugify(v.size).toUpperCase() : "";
          const weightCode = v.weight ? slugify(v.weight).toUpperCase() : "";
          const codes = [colorCode, sizeCode, weightCode].filter(Boolean);
          const variantSku = codes.length > 0 ? `${existing.sku}-${codes.join("-")}` : `${existing.sku}-VAR`;

          return {
            productId: id,
            sku: variantSku,
            color: v.color || null,
            size: v.size || null,
            weight: v.weight || null,
            price: v.price ? new Prisma.Decimal(v.price) : null,
            costPrice: v.costPrice ? new Prisma.Decimal(v.costPrice) : null,
            originalPrice: v.originalPrice ? new Prisma.Decimal(v.originalPrice) : null,
            stock: v.stock ?? 0,
            image: v.image || null,
            imageKey: v.imageKey || null,
          };
        }),

      });
    }

    // Insert any new gallery images
    if (newGalleryImages.length > 0) {
      await tx.productImage.createMany({
        data: newGalleryImages.map((img) => ({
          productId: id,
          url: img.url,
          key: img.key,
          order: img.order,
          isThumbnail: false,
        })),
      });
    }

    const product = await tx.product.update({
      where: { id },
      data: {
        ...(payload.name && { name: payload.name, slug }),
        ...(payload.price !== undefined && { price: new Prisma.Decimal(payload.price) }),
        ...(payload.originalPrice !== undefined && {
          originalPrice: payload.originalPrice ? new Prisma.Decimal(payload.originalPrice) : null,
        }),
        ...(payload.costPrice !== undefined && {
          costPrice: payload.costPrice ? new Prisma.Decimal(payload.costPrice) : null,
        }),
        stock: totalStock,
        ...(payload.lowStockThreshold !== undefined && { lowStockThreshold: payload.lowStockThreshold }),
        stockStatus,

        ...(payload.showStorefrontBadge !== undefined && {
          showStorefrontBadge: payload.showStorefrontBadge,
        }),
        ...(payload.storefrontBadgeText !== undefined && {
          storefrontBadgeText: payload.storefrontBadgeText || null,
        }),

        ...(payload.hasVoucher !== undefined && { hasVoucher: payload.hasVoucher }),
        ...(payload.voucherDiscountType !== undefined && {
          voucherDiscountType: payload.voucherDiscountType || null,
        }),
        ...(payload.voucherDiscountValue !== undefined && {
          voucherDiscountValue: payload.voucherDiscountValue
            ? new Prisma.Decimal(payload.voucherDiscountValue)
            : null,
        }),
        ...(payload.voucherCouponCode !== undefined && {
          voucherCouponCode: payload.voucherCouponCode || null,
        }),
        ...(payload.showVoucherBadge !== undefined && {
          showVoucherBadge: payload.showVoucherBadge,
        }),

        ...(payload.categoryId && { categoryId: payload.categoryId }),
        ...(payload.subCategoryId !== undefined && { subCategoryId: payload.subCategoryId || null }),
        ...(payload.brandId !== undefined && { brandId: payload.brandId || null }),

        ...(payload.shortDescription !== undefined && { shortDescription: payload.shortDescription || null }),
        ...(payload.description !== undefined && { description: payload.description || null }),
        ...(payload.specifications !== undefined && {
          specifications: payload.specifications
            ? (payload.specifications as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        }),
        ...(payload.warranty !== undefined && { warranty: payload.warranty || null }),

        ...(payload.metaTitle !== undefined && { metaTitle: payload.metaTitle || null }),
        ...(payload.metaDescription !== undefined && { metaDescription: payload.metaDescription || null }),
        ...(payload.metaKeywords !== undefined && { metaKeywords: payload.metaKeywords || null }),

        thumbnail,
        thumbnailKey,
        hasVariants,

        ...(payload.isFeatured !== undefined && { isFeatured: payload.isFeatured }),
        ...(payload.isFlashDeal !== undefined && { isFlashDeal: payload.isFlashDeal }),
        ...(payload.isActive !== undefined && { isActive: payload.isActive }),
      },
      include: productInclude,
    });

    return product;
  });

  return withDisplayImageUrl(updated);
};

// ==================== DELETE PRODUCT (SOFT DELETE) ====================
const deleteProduct = async (id: string) => {
  const existing = await prisma.product.findFirst({
    where: { id, isDeleted: false },
  });

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Product not found or already deleted");
  }

  const deleted = await prisma.product.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      isActive: false,
    },
    include: productInclude,
  });

  return withDisplayImageUrl(deleted);
};

export const ProductService = {
  createProduct,
  getAllProducts,
  getAllProductsAdmin,
  getProductBySlug,
  getProductById,
  updateProduct,
  deleteProduct,
};
