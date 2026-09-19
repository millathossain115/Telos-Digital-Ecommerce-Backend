import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import prisma from "../../lib/prisma";
import { DEFAULT_REPORT_PAGE_LIMIT, MAX_REPORT_EXPORT_LIMIT } from "./report.constant";
import {
  ILowStockReportItem,
  ILowStockReportSummary,
  IProfitReportItem,
  IProfitReportSummary,
  IReportFilterPayload,
  ISalesReportItem,
  ISalesReportSummary,
  IStockReportItem,
  IStockReportSummary,
  ITransactionReportItem,
  ITransactionReportSummary,
  TReportDatePreset,
} from "./report.interface";

// ==================== DATE RANGE HELPER ====================
export const getDateBounds = (
  preset?: TReportDatePreset,
  startDate?: string,
  endDate?: string,
): { gte?: Date; lte?: Date } | undefined => {
  const now = new Date();

  if (preset === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  if (preset === "this_week") {
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday + 6, 23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  if (preset === "last_week") {
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday - 7, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday - 1, 23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  if (preset === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  if (preset === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  if (preset === "custom" || (startDate && endDate)) {
    const range: { gte?: Date; lte?: Date } = {};
    if (startDate) {
      const s = new Date(startDate);
      if (!isNaN(s.getTime())) {
        s.setHours(0, 0, 0, 0);
        range.gte = s;
      }
    }
    if (endDate) {
      const e = new Date(endDate);
      if (!isNaN(e.getTime())) {
        e.setHours(23, 59, 59, 999);
        range.lte = e;
      }
    }
    return Object.keys(range).length > 0 ? range : undefined;
  }

  // "all_time" or undefined
  return undefined;
};

// ==================== 1. PROFIT REPORT ====================
const getProfitReport = async (payload: IReportFilterPayload) => {
  const {
    dateRange = "all_time",
    startDate,
    endDate,
    search,
    page = 1,
    limit = DEFAULT_REPORT_PAGE_LIMIT,
    isExport = false,
    status,
  } = payload;

  const dateBounds = getDateBounds(dateRange, startDate, endDate);

  const whereClause: Prisma.OrderWhereInput = {
    ...(dateBounds && { createdAt: dateBounds }),
    status: OrderStatus.DELIVERED,
  };

  if (search && search.trim()) {
    const term = search.trim();
    whereClause.OR = [
      { orderNumber: { contains: term, mode: "insensitive" } },
      { customerDetails: { name: { contains: term, mode: "insensitive" } } },
      { customerDetails: { phone: { contains: term, mode: "insensitive" } } },
    ];
  }

  // All matching orders for summary aggregation
  const allMatchingOrders = await prisma.order.findMany({
    where: whereClause,
    include: {
      items: {
        include: {
          product: {
            select: {
              costPrice: true,
              price: true,
            },
          },
          variant: {
            select: {
              costPrice: true,
              price: true,
            },
          },
        },
      },
      customerDetails: true,
    },
    orderBy: { createdAt: "desc" },
  });

  let totalRevenue = 0;
  let totalCost = 0;
  let deliveredOrdersCount = 0;

  const mappedItems: IProfitReportItem[] = allMatchingOrders.map((order) => {
    const orderTotal = Number(order.total);
    const subtotal = Number(order.subtotal);
    const deliveryFee = Number(order.deliveryFee);
    const discount = Number(order.discount);

    totalRevenue += orderTotal;
    if (order.status === OrderStatus.DELIVERED) {
      deliveredOrdersCount++;
    }

    // Estimate product costs
    let orderCost = 0;
    let itemsCount = 0;

    order.items.forEach((item) => {
      itemsCount += item.quantity;
      const unitPrice = Number(item.unitPrice);
      // Cost resolution: ProductVariant costPrice -> Product costPrice -> 70% of unitPrice fallback
      const variantCost = item.variant?.costPrice ? Number(item.variant.costPrice) : null;
      const productCost = item.product?.costPrice ? Number(item.product.costPrice) : null;
      const resolvedCost = variantCost ?? productCost ?? Math.round(unitPrice * 0.7);

      orderCost += resolvedCost * item.quantity;
    });

    totalCost += orderCost;
    const grossProfit = Math.round((orderTotal - orderCost) * 100) / 100;
    const profitMargin =
      orderTotal > 0 ? Math.round((grossProfit / orderTotal) * 10000) / 100 : 0;

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt.toISOString(),
      customerName: order.customerDetails?.name || "Guest Customer",
      customerPhone: order.customerDetails?.phone || null,
      itemsCount,
      orderTotal,
      deliveryFee,
      discount,
      estimatedCost: orderCost,
      grossProfit,
      profitMargin,
      orderStatus: order.status,
      paymentStatus: order.paymentStatus,
    };
  });

  const totalOrders = allMatchingOrders.length;
  const grossProfit = Math.round((totalRevenue - totalCost) * 100) / 100;
  const profitMargin =
    totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 10000) / 100 : 0;
  const averageOrderValue =
    totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;

  const summary: IProfitReportSummary = {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    grossProfit,
    profitMargin,
    totalOrders,
    averageOrderValue,
    deliveredOrdersCount,
  };

  // Pagination or full export
  const effectiveLimit = isExport ? MAX_REPORT_EXPORT_LIMIT : limit;
  const effectivePage = isExport ? 1 : page;
  const startIndex = (effectivePage - 1) * effectiveLimit;
  const paginatedItems = isExport
    ? mappedItems
    : mappedItems.slice(startIndex, startIndex + effectiveLimit);

  return {
    summary,
    items: paginatedItems,
    meta: {
      page: effectivePage,
      limit: effectiveLimit,
      total: totalOrders,
      totalPage: Math.ceil(totalOrders / effectiveLimit) || 1,
    },
  };
};

// ==================== 2. STOCK / INVENTORY VALUATION REPORT ====================
const getStockReport = async (payload: IReportFilterPayload) => {
  const {
    dateRange = "all_time",
    startDate,
    endDate,
    search,
    page = 1,
    limit = DEFAULT_REPORT_PAGE_LIMIT,
    isExport = false,
    categoryId,
    brandId,
    stockStatus,
  } = payload;

  const dateBounds = getDateBounds(dateRange, startDate, endDate);

  const whereClause: Prisma.ProductWhereInput = {
    isDeleted: false,
    ...(dateBounds && { createdAt: dateBounds }),
    ...(categoryId && { categoryId }),
    ...(brandId && { brandId }),
    ...(stockStatus && { stockStatus: stockStatus as any }),
  };

  if (search && search.trim()) {
    const term = search.trim();
    whereClause.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { sku: { contains: term, mode: "insensitive" } },
      { category: { name: { contains: term, mode: "insensitive" } } },
      { brand: { name: { contains: term, mode: "insensitive" } } },
    ];
  }

  const allProducts = await prisma.product.findMany({
    where: whereClause,
    include: {
      category: { select: { name: true } },
      brand: { select: { name: true } },
    },
    orderBy: { stock: "asc" },
  });

  let totalUnitsInStock = 0;
  let totalInventoryCostValue = 0;
  let totalInventoryRetailValue = 0;
  let outOfStockCount = 0;
  let lowStockCount = 0;

  const mappedItems: IStockReportItem[] = allProducts.map((prod) => {
    const stock = prod.stock;
    const unitPrice = Number(prod.price);
    const unitCost = prod.costPrice ? Number(prod.costPrice) : Math.round(unitPrice * 0.7);

    totalUnitsInStock += stock;
    const totalCostValue = Math.round(stock * unitCost * 100) / 100;
    const totalRetailValue = Math.round(stock * unitPrice * 100) / 100;
    const potentialProfit = Math.round((totalRetailValue - totalCostValue) * 100) / 100;

    totalInventoryCostValue += totalCostValue;
    totalInventoryRetailValue += totalRetailValue;

    if (stock === 0) {
      outOfStockCount++;
    } else if (stock <= prod.lowStockThreshold) {
      lowStockCount++;
    }

    return {
      id: prod.id,
      name: prod.name,
      sku: prod.sku,
      categoryName: prod.category?.name || "Uncategorized",
      brandName: prod.brand?.name || null,
      stock,
      lowStockThreshold: prod.lowStockThreshold,
      unitCost,
      unitPrice,
      totalCostValue,
      totalRetailValue,
      potentialProfit,
      stockStatus: prod.stockStatus,
      createdAt: prod.createdAt.toISOString(),
      updatedAt: prod.updatedAt.toISOString(),
    };
  });

  const potentialProfit =
    Math.round((totalInventoryRetailValue - totalInventoryCostValue) * 100) / 100;

  const summary: IStockReportSummary = {
    totalProductsCount: allProducts.length,
    totalUnitsInStock,
    totalInventoryCostValue: Math.round(totalInventoryCostValue * 100) / 100,
    totalInventoryRetailValue: Math.round(totalInventoryRetailValue * 100) / 100,
    potentialProfit,
    outOfStockCount,
    lowStockCount,
  };

  const effectiveLimit = isExport ? MAX_REPORT_EXPORT_LIMIT : limit;
  const effectivePage = isExport ? 1 : page;
  const startIndex = (effectivePage - 1) * effectiveLimit;
  const paginatedItems = isExport
    ? mappedItems
    : mappedItems.slice(startIndex, startIndex + effectiveLimit);

  return {
    summary,
    items: paginatedItems,
    meta: {
      page: effectivePage,
      limit: effectiveLimit,
      total: allProducts.length,
      totalPage: Math.ceil(allProducts.length / effectiveLimit) || 1,
    },
  };
};

// ==================== 3. LOW-STOCK ALERT REPORT ====================
const getLowStockReport = async (payload: IReportFilterPayload) => {
  const {
    dateRange = "all_time",
    startDate,
    endDate,
    search,
    page = 1,
    limit = DEFAULT_REPORT_PAGE_LIMIT,
    isExport = false,
    categoryId,
    brandId,
  } = payload;

  const dateBounds = getDateBounds(dateRange, startDate, endDate);

  const whereClause: Prisma.ProductWhereInput = {
    isDeleted: false,
    ...(dateBounds && { createdAt: dateBounds }),
    ...(categoryId && { categoryId }),
    ...(brandId && { brandId }),
    OR: [
      { stock: { lte: 10 } }, // Catch standard low threshold items
      { stockStatus: "LOW_STOCK" },
      { stockStatus: "OUT_OF_STOCK" },
    ],
  };

  if (search && search.trim()) {
    const term = search.trim();
    whereClause.AND = [
      {
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { sku: { contains: term, mode: "insensitive" } },
          { category: { name: { contains: term, mode: "insensitive" } } },
          { brand: { name: { contains: term, mode: "insensitive" } } },
        ],
      },
    ];
  }

  const lowStockProducts = await prisma.product.findMany({
    where: whereClause,
    include: {
      category: { select: { name: true } },
      brand: { select: { name: true } },
    },
    orderBy: { stock: "asc" },
  });

  // Filter items where stock <= lowStockThreshold
  const filteredProducts = lowStockProducts.filter(
    (p) => p.stock <= p.lowStockThreshold || p.stockStatus === "OUT_OF_STOCK" || p.stockStatus === "LOW_STOCK",
  );

  let lowStockItemsCount = 0;
  let outOfStockItemsCount = 0;
  let totalUnitsDeficit = 0;
  let estimatedRestockCost = 0;

  const mappedItems: ILowStockReportItem[] = filteredProducts.map((prod) => {
    const currentStock = prod.stock;
    const threshold = prod.lowStockThreshold;
    const unitPrice = Number(prod.price);
    const unitCost = prod.costPrice ? Number(prod.costPrice) : Math.round(unitPrice * 0.7);

    // Target reorder to reach twice the threshold (minimum 10 units)
    const targetStock = Math.max(threshold * 2, 10);
    const deficitUnits = Math.max(0, targetStock - currentStock);
    const estimatedInvestment = Math.round(deficitUnits * unitCost * 100) / 100;

    totalUnitsDeficit += deficitUnits;
    estimatedRestockCost += estimatedInvestment;

    if (currentStock === 0) {
      outOfStockItemsCount++;
    } else {
      lowStockItemsCount++;
    }

    let urgency: "CRITICAL" | "WARNING" | "ATTENTION" = "ATTENTION";
    if (currentStock === 0) {
      urgency = "CRITICAL";
    } else if (currentStock <= Math.ceil(threshold / 2)) {
      urgency = "WARNING";
    }

    return {
      id: prod.id,
      name: prod.name,
      sku: prod.sku,
      categoryName: prod.category?.name || "Uncategorized",
      brandName: prod.brand?.name || null,
      currentStock,
      lowStockThreshold: threshold,
      deficitUnits,
      unitCost,
      unitPrice,
      estimatedRestockInvestment: estimatedInvestment,
      urgency,
      updatedAt: prod.updatedAt.toISOString(),
    };
  });

  const summary: ILowStockReportSummary = {
    lowStockItemsCount,
    outOfStockItemsCount,
    totalUnitsDeficit,
    estimatedRestockCost: Math.round(estimatedRestockCost * 100) / 100,
  };

  const effectiveLimit = isExport ? MAX_REPORT_EXPORT_LIMIT : limit;
  const effectivePage = isExport ? 1 : page;
  const startIndex = (effectivePage - 1) * effectiveLimit;
  const paginatedItems = isExport
    ? mappedItems
    : mappedItems.slice(startIndex, startIndex + effectiveLimit);

  return {
    summary,
    items: paginatedItems,
    meta: {
      page: effectivePage,
      limit: effectiveLimit,
      total: filteredProducts.length,
      totalPage: Math.ceil(filteredProducts.length / effectiveLimit) || 1,
    },
  };
};

// ==================== 4. TRANSACTION REPORT ====================
const getTransactionReport = async (payload: IReportFilterPayload) => {
  const {
    dateRange = "all_time",
    startDate,
    endDate,
    search,
    page = 1,
    limit = DEFAULT_REPORT_PAGE_LIMIT,
    isExport = false,
    paymentMethod,
    status,
  } = payload;

  const dateBounds = getDateBounds(dateRange, startDate, endDate);

  const whereClause: Prisma.OrderTransactionWhereInput = {
    ...(dateBounds && { createdAt: dateBounds }),
    ...(paymentMethod && { paymentMethod: { equals: paymentMethod, mode: "insensitive" } }),
    status: { in: ["verified", "paid", "VERIFIED", "PAID"] },
    order: {
      status: OrderStatus.DELIVERED,
    },
  };

  if (search && search.trim()) {
    const term = search.trim();
    whereClause.OR = [
      { trxId: { contains: term, mode: "insensitive" } },
      { mfsNumber: { contains: term, mode: "insensitive" } },
      { order: { orderNumber: { contains: term, mode: "insensitive" } } },
      { order: { customerDetails: { name: { contains: term, mode: "insensitive" } } } },
      { order: { customerDetails: { phone: { contains: term, mode: "insensitive" } } } },
    ];
  }

  const allTransactions = await prisma.orderTransaction.findMany({
    where: whereClause,
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          customerDetails: {
            select: {
              name: true,
              phone: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  let totalAmount = 0;
  let successfulAmount = 0;
  let pendingAmount = 0;
  const methodMap: Record<string, { count: number; amount: number }> = {};

  const mappedItems: ITransactionReportItem[] = allTransactions.map((trx) => {
    const amt = Number(trx.amount);
    totalAmount += amt;

    const normalizedStatus = trx.status.toLowerCase();
    if (normalizedStatus === "paid" || normalizedStatus === "verified" || normalizedStatus === "success") {
      successfulAmount += amt;
    } else if (normalizedStatus === "pending") {
      pendingAmount += amt;
    }

    const normMethod = (trx.paymentMethod || "UNKNOWN").toUpperCase();
    if (!methodMap[normMethod]) {
      methodMap[normMethod] = { count: 0, amount: 0 };
    }
    methodMap[normMethod].count++;
    methodMap[normMethod].amount += amt;

    return {
      id: trx.id,
      trxId: trx.trxId,
      orderId: trx.orderId,
      orderNumber: trx.order.orderNumber,
      paymentMethod: normMethod,
      mfsNumber: trx.mfsNumber,
      amount: amt,
      status: trx.status,
      createdAt: trx.createdAt.toISOString(),
      customerName: trx.order.customerDetails?.name || "Customer",
      customerPhone: trx.order.customerDetails?.phone || null,
    };
  });

  const breakdownByMethod = Object.entries(methodMap).map(([method, data]) => ({
    method,
    count: data.count,
    amount: Math.round(data.amount * 100) / 100,
  }));

  const summary: ITransactionReportSummary = {
    totalTransactionsCount: allTransactions.length,
    totalAmount: Math.round(totalAmount * 100) / 100,
    successfulAmount: Math.round(successfulAmount * 100) / 100,
    pendingAmount: Math.round(pendingAmount * 100) / 100,
    breakdownByMethod,
  };

  const effectiveLimit = isExport ? MAX_REPORT_EXPORT_LIMIT : limit;
  const effectivePage = isExport ? 1 : page;
  const startIndex = (effectivePage - 1) * effectiveLimit;
  const paginatedItems = isExport
    ? mappedItems
    : mappedItems.slice(startIndex, startIndex + effectiveLimit);

  return {
    summary,
    items: paginatedItems,
    meta: {
      page: effectivePage,
      limit: effectiveLimit,
      total: allTransactions.length,
      totalPage: Math.ceil(allTransactions.length / effectiveLimit) || 1,
    },
  };
};

// ==================== 5. SALES & REVENUE REPORT ====================
const getSalesReport = async (payload: IReportFilterPayload) => {
  const {
    dateRange = "all_time",
    startDate,
    endDate,
    search,
    page = 1,
    limit = DEFAULT_REPORT_PAGE_LIMIT,
    isExport = false,
    status,
    paymentMethod,
  } = payload;

  const dateBounds = getDateBounds(dateRange, startDate, endDate);

  const whereClause: Prisma.OrderWhereInput = {
    ...(dateBounds && { createdAt: dateBounds }),
    status: OrderStatus.DELIVERED,
  };

  if (search && search.trim()) {
    const term = search.trim();
    whereClause.OR = [
      { orderNumber: { contains: term, mode: "insensitive" } },
      { customerDetails: { name: { contains: term, mode: "insensitive" } } },
      { customerDetails: { phone: { contains: term, mode: "insensitive" } } },
      { customerDetails: { city: { contains: term, mode: "insensitive" } } },
    ];
  }

  const allOrders = await prisma.order.findMany({
    where: whereClause,
    include: {
      items: true,
      customerDetails: true,
      transactions: {
        select: {
          paymentMethod: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Filter by payment method if specified
  const filteredOrders = paymentMethod
    ? allOrders.filter((o) =>
        o.transactions.some(
          (t) => t.paymentMethod.toLowerCase() === paymentMethod.toLowerCase(),
        ),
      )
    : allOrders;

  let totalGrossSales = 0;
  let totalNetSales = 0;
  let totalDiscounts = 0;
  let totalDeliveryFees = 0;
  let totalItemsSold = 0;

  const mappedItems: ISalesReportItem[] = filteredOrders.map((order) => {
    const subtotal = Number(order.subtotal);
    const discount = Number(order.discount);
    const deliveryFee = Number(order.deliveryFee);
    const total = Number(order.total);

    totalGrossSales += subtotal;
    totalNetSales += total;
    totalDiscounts += discount;
    totalDeliveryFees += deliveryFee;

    const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
    totalItemsSold += itemsCount;

    const primaryPaymentMethod =
      order.transactions[0]?.paymentMethod?.toUpperCase() || "COD";

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt.toISOString(),
      customerName: order.customerDetails?.name || "Guest Customer",
      customerCity: order.customerDetails?.city || "Dhaka",
      customerPhone: order.customerDetails?.phone || null,
      itemsCount,
      subtotal,
      discount,
      deliveryFee,
      total,
      paymentMethod: primaryPaymentMethod,
      orderStatus: order.status,
      paymentStatus: order.paymentStatus,
    };
  });

  const totalOrdersCount = filteredOrders.length;
  const averageOrderValue =
    totalOrdersCount > 0 ? Math.round((totalNetSales / totalOrdersCount) * 100) / 100 : 0;

  const summary: ISalesReportSummary = {
    totalGrossSales: Math.round(totalGrossSales * 100) / 100,
    totalNetSales: Math.round(totalNetSales * 100) / 100,
    totalDiscounts: Math.round(totalDiscounts * 100) / 100,
    totalDeliveryFees: Math.round(totalDeliveryFees * 100) / 100,
    totalOrdersCount,
    averageOrderValue,
    totalItemsSold,
  };

  const effectiveLimit = isExport ? MAX_REPORT_EXPORT_LIMIT : limit;
  const effectivePage = isExport ? 1 : page;
  const startIndex = (effectivePage - 1) * effectiveLimit;
  const paginatedItems = isExport
    ? mappedItems
    : mappedItems.slice(startIndex, startIndex + effectiveLimit);

  return {
    summary,
    items: paginatedItems,
    meta: {
      page: effectivePage,
      limit: effectiveLimit,
      total: totalOrdersCount,
      totalPage: Math.ceil(totalOrdersCount / effectiveLimit) || 1,
    },
  };
};

export const ReportService = {
  getProfitReport,
  getStockReport,
  getLowStockReport,
  getTransactionReport,
  getSalesReport,
};
