import httpStatus from "http-status";
import { Prisma, StockStatus } from "@prisma/client";
import prisma from "../../lib/prisma";
import AppError from "../../errors/AppError";
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
  inventoryAuditSearchableFields,
  inventoryAuditSortableFields,
} from "./inventory.constant";
import {
  TInventoryAuditFilterRequest,
  TStockAdjustmentPayload,
} from "./inventory.interface";

// ==================== ADJUST PRODUCT STOCK ====================
const adjustStock = async (
  payload: TStockAdjustmentPayload,
  adminUser?: { name?: string; email?: string },
) => {
  return await prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: { id: payload.productId, isDeleted: false },
    });

    if (!product) {
      throw new AppError(httpStatus.NOT_FOUND, "Product not found in catalog");
    }

    const currentStock = product.stock;
    let newStock = currentStock;

    if (payload.actionType === "INCREASE") {
      newStock = currentStock + payload.quantity;
    } else if (payload.actionType === "DECREASE") {
      newStock = currentStock - payload.quantity;
      if (newStock < 0) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Cannot reduce stock below 0. Product "${product.name}" currently has ${currentStock} units in stock.`,
        );
      }
    }

    // Determine updated stock status
    const newStockStatus =
      newStock <= 0
        ? StockStatus.OUT_OF_STOCK
        : newStock <= product.lowStockThreshold
          ? StockStatus.LOW_STOCK
          : StockStatus.IN_STOCK;

    // Update product stock balance and status
    const updatedProduct = await tx.product.update({
      where: { id: product.id },
      data: {
        stock: newStock,
        stockStatus: newStockStatus,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        slug: true,
        thumbnail: true,
        price: true,
        stock: true,
        stockStatus: true,
        lowStockThreshold: true,
      },
    });

    // Create immutable audit log entry
    const auditLog = await tx.stockAuditLog.create({
      data: {
        productId: product.id,
        actionType: payload.actionType,
        quantity: payload.quantity,
        previousStock: currentStock,
        newStock: newStock,
        reason: payload.reason,
        note: payload.note || null,
        performedBy: adminUser?.name || adminUser?.email || "Super Admin",
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            slug: true,
            thumbnail: true,
            price: true,
            category: { select: { name: true } },
          },
        },
      },
    });

    return {
      product: updatedProduct,
      auditLog,
    };
  });
};

// ==================== GET INVENTORY AUDIT LOGS ====================
const getAuditLogs = async (
  filters: TInventoryAuditFilterRequest,
  paginationOptions: IPaginationOptions,
  sortOptions: ISortOptions,
) => {
  const { page, limit, skip } = calculatePagination(paginationOptions);
  const andConditions: Prisma.StockAuditLogWhereInput[] = [];

  // Search filter across reason, note, performedBy, and related product name/sku
  if (filters.searchTerm) {
    const term = filters.searchTerm.trim();
    andConditions.push({
      OR: [
        { reason: { contains: term, mode: "insensitive" } },
        { note: { contains: term, mode: "insensitive" } },
        { performedBy: { contains: term, mode: "insensitive" } },
        {
          product: {
            OR: [
              { name: { contains: term, mode: "insensitive" } },
              { sku: { contains: term, mode: "insensitive" } },
            ],
          },
        },
      ],
    });
  }

  if (filters.productId) {
    andConditions.push({ productId: filters.productId });
  }

  if (filters.actionType) {
    andConditions.push({ actionType: filters.actionType });
  }

  if (filters.reason) {
    andConditions.push({ reason: { equals: filters.reason, mode: "insensitive" } });
  }

  if (filters.startDate || filters.endDate) {
    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (filters.startDate) {
      createdAtFilter.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      createdAtFilter.lte = new Date(filters.endDate);
    }
    andConditions.push({ createdAt: createdAtFilter });
  }

  const whereConditions: Prisma.StockAuditLogWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const orderBy = buildSortOrder(sortOptions, inventoryAuditSortableFields, "createdAt", "desc");

  const [auditLogs, total] = await Promise.all([
    prisma.stockAuditLog.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            slug: true,
            thumbnail: true,
            price: true,
            category: { select: { name: true } },
          },
        },
      },
    }),
    prisma.stockAuditLog.count({ where: whereConditions }),
  ]);

  return {
    meta: buildPaginationMeta(page, limit, total),
    data: auditLogs,
  };
};

// ==================== GET AUDIT KPI SUMMARY ====================
const getAuditSummary = async () => {
  const [totalLogs, additionsAgg, reductionsAgg] = await Promise.all([
    prisma.stockAuditLog.count(),
    prisma.stockAuditLog.aggregate({
      where: { actionType: "INCREASE" },
      _sum: { quantity: true },
    }),
    prisma.stockAuditLog.aggregate({
      where: { actionType: "DECREASE" },
      _sum: { quantity: true },
    }),
  ]);

  const totalAdded = additionsAgg._sum.quantity || 0;
  const totalRemoved = reductionsAgg._sum.quantity || 0;
  const netChange = totalAdded - totalRemoved;

  return {
    totalLogs,
    totalAdded,
    totalRemoved,
    netChange,
  };
};

export const InventoryService = {
  adjustStock,
  getAuditLogs,
  getAuditSummary,
};
