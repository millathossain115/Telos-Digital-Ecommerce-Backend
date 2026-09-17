import { Prisma } from "@prisma/client";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
import {
  buildPaginationMeta,
  calculatePagination,
  IPaginationOptions,
} from "../../shared/paginationHelper";
import {
  TAddToWishlistPayload,
  TWishlistFilterRequest,
} from "./wishlist.interface";

const wishlistProductSelect = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  price: true,
  originalPrice: true,
  costPrice: true,
  stock: true,
  stockStatus: true,
  thumbnail: true,
  rating: true,
  reviewCount: true,
  category: {
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
    },
  },
};

const getMyWishlist = async (customerId: string) => {
  const items = await prisma.wishlistItem.findMany({
    where: { customerId },
    include: {
      product: {
        select: wishlistProductSelect,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    items,
    totalItems: items.length,
  };
};

const addToWishlist = async (customerId: string, payload: TAddToWishlistPayload) => {
  const product = await prisma.product.findFirst({
    where: { id: payload.productId, isDeleted: false, isActive: true },
  });

  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, "Product not found or is currently inactive");
  }

  await prisma.wishlistItem.upsert({
    where: {
      customerId_productId: {
        customerId,
        productId: payload.productId,
      },
    },
    update: {},
    create: {
      customerId,
      productId: payload.productId,
    },
  });

  return getMyWishlist(customerId);
};

const removeWishlistItem = async (customerId: string, idOrProductId: string) => {
  // Support deletion either by wishlistItem.id or by product.id
  const item = await prisma.wishlistItem.findFirst({
    where: {
      customerId,
      OR: [
        { id: idOrProductId },
        { productId: idOrProductId },
      ],
    },
  });

  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, "Item not found in your wishlist");
  }

  await prisma.wishlistItem.delete({
    where: { id: item.id },
  });

  return getMyWishlist(customerId);
};

const clearWishlist = async (customerId: string) => {
  await prisma.wishlistItem.deleteMany({
    where: { customerId },
  });

  return {
    items: [],
    totalItems: 0,
  };
};

const getAllWishlists = async (
  filters: TWishlistFilterRequest,
  paginationOptions?: IPaginationOptions,
) => {
  const { page, limit, skip } = calculatePagination(paginationOptions);

  const andConditions: Prisma.WishlistItemWhereInput[] = [];

  if (filters.customerId) {
    andConditions.push({ customerId: filters.customerId });
  }

  if (filters.productId) {
    andConditions.push({ productId: filters.productId });
  }

  if (filters.searchTerm) {
    andConditions.push({
      OR: [
        { customer: { name: { contains: filters.searchTerm, mode: "insensitive" } } },
        { customer: { email: { contains: filters.searchTerm, mode: "insensitive" } } },
        { customer: { phone: { contains: filters.searchTerm, mode: "insensitive" } } },
        { product: { name: { contains: filters.searchTerm, mode: "insensitive" } } },
        { product: { sku: { contains: filters.searchTerm, mode: "insensitive" } } },
      ],
    });
  }

  const whereConditions: Prisma.WishlistItemWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const [items, total] = await Promise.all([
    prisma.wishlistItem.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        customer: {
          select: {
            id: true,
            customerId: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
        product: {
          select: wishlistProductSelect,
        },
      },
    }),
    prisma.wishlistItem.count({ where: whereConditions }),
  ]);

  return {
    meta: buildPaginationMeta(page, limit, total),
    data: items,
  };
};

const deleteAdminWishlistItem = async (id: string) => {
  const item = await prisma.wishlistItem.findUnique({
    where: { id },
  });

  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, "Wishlist item not found");
  }

  return prisma.wishlistItem.delete({
    where: { id },
  });
};

const bulkDeleteAdminWishlistItems = async (ids: string[]) => {
  const result = await prisma.wishlistItem.deleteMany({
    where: {
      id: { in: ids },
    },
  });

  return {
    deletedCount: result.count,
  };
};

export const WishlistService = {
  getMyWishlist,
  addToWishlist,
  removeWishlistItem,
  clearWishlist,
  getAllWishlists,
  deleteAdminWishlistItem,
  bulkDeleteAdminWishlistItems,
};
