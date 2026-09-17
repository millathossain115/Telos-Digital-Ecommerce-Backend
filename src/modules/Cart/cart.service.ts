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
  TAddToCartPayload,
  TCartFilterRequest,
  TUpdateCartItemPayload,
} from "./cart.interface";

const cartItemInclude = {
  product: {
    select: {
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
    },
  },
  variant: {
    select: {
      id: true,
      sku: true,
      color: true,
      size: true,
      weight: true,
      price: true,
      costPrice: true,
      stock: true,
      image: true,
    },
  },
};

const getMyCart = async (customerId: string) => {
  const items = await prisma.cartItem.findMany({
    where: { customerId },
    include: cartItemInclude,
    orderBy: { createdAt: "desc" },
  });

  const formattedItems = items.map((item) => {
    const unitPrice = item.variant?.price ? Number(item.variant.price) : Number(item.product.price);
    const subtotal = unitPrice * item.quantity;
    return {
      ...item,
      unitPrice,
      subtotal,
    };
  });

  const totalItems = formattedItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = formattedItems.reduce((acc, item) => acc + item.subtotal, 0);

  return {
    items: formattedItems,
    totalItems,
    subtotal,
  };
};

const addToCart = async (customerId: string, payload: TAddToCartPayload) => {
  const product = await prisma.product.findFirst({
    where: { id: payload.productId, isDeleted: false, isActive: true },
  });

  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, "Product not found or is currently inactive");
  }

  const requestedQuantity = payload.quantity && payload.quantity > 0 ? payload.quantity : 1;
  const availableStock = product.stock;

  // Check if item already exists in this customer's cart
  const existingItem = await prisma.cartItem.findFirst({
    where: {
      customerId,
      productId: payload.productId,
      variantId: payload.variantId || null,
    },
  });

  if (existingItem) {
    const newQuantity = existingItem.quantity + requestedQuantity;
    const finalQuantity = Math.min(availableStock > 0 ? availableStock : 1, newQuantity);

    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: finalQuantity },
    });
  } else {
    const finalQuantity = Math.min(availableStock > 0 ? availableStock : 1, requestedQuantity);

    await prisma.cartItem.create({
      data: {
        customerId,
        productId: payload.productId,
        variantId: payload.variantId || null,
        quantity: finalQuantity,
      },
    });
  }

  return getMyCart(customerId);
};

const updateCartItem = async (
  customerId: string,
  itemId: string,
  payload: TUpdateCartItemPayload,
) => {
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, customerId },
    include: { product: true },
  });

  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, "Cart item not found");
  }

  if (payload.quantity <= 0) {
    await prisma.cartItem.delete({
      where: { id: itemId },
    });
  } else {
    const maxStock = item.product.stock > 0 ? item.product.stock : 1;
    const finalQuantity = Math.min(maxStock, payload.quantity);

    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: finalQuantity },
    });
  }

  return getMyCart(customerId);
};

const removeCartItem = async (customerId: string, itemId: string) => {
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, customerId },
  });

  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, "Cart item not found in your cart");
  }

  await prisma.cartItem.delete({
    where: { id: itemId },
  });

  return getMyCart(customerId);
};

const clearCart = async (customerId: string) => {
  await prisma.cartItem.deleteMany({
    where: { customerId },
  });

  return {
    items: [],
    totalItems: 0,
    subtotal: 0,
  };
};

const getAllCarts = async (
  filters: TCartFilterRequest,
  paginationOptions?: IPaginationOptions,
) => {
  const { page, limit, skip } = calculatePagination(paginationOptions);

  const andConditions: Prisma.CartItemWhereInput[] = [];

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

  const whereConditions: Prisma.CartItemWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const [items, total] = await Promise.all([
    prisma.cartItem.findMany({
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
        ...cartItemInclude,
      },
    }),
    prisma.cartItem.count({ where: whereConditions }),
  ]);

  const formattedItems = items.map((item) => {
    const unitPrice = item.variant?.price ? Number(item.variant.price) : Number(item.product.price);
    const costPrice = item.variant?.costPrice
      ? Number(item.variant.costPrice)
      : item.product.costPrice
        ? Number(item.product.costPrice)
        : Math.round(unitPrice * 0.75);
    const subtotal = unitPrice * item.quantity;
    return {
      ...item,
      unitPrice,
      costPrice,
      subtotal,
    };
  });

  return {
    meta: buildPaginationMeta(page, limit, total),
    data: formattedItems,
  };
};

const deleteAdminCartItem = async (id: string) => {
  const item = await prisma.cartItem.findUnique({
    where: { id },
  });

  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, "Cart item not found");
  }

  return prisma.cartItem.delete({
    where: { id },
  });
};

const bulkDeleteAdminCartItems = async (ids: string[]) => {
  const result = await prisma.cartItem.deleteMany({
    where: {
      id: { in: ids },
    },
  });

  return {
    deletedCount: result.count,
  };
};

export const CartService = {
  getMyCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  getAllCarts,
  deleteAdminCartItem,
  bulkDeleteAdminCartItems,
};
