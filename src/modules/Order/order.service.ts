import { OrderStatus, PaymentStatus, Prisma, StockStatus } from "@prisma/client";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
import {
  buildPaginationMeta,
  calculatePagination,
  IPaginationOptions,
} from "../../shared/paginationHelper";
import { buildSortOrder, ISortOptions } from "../../shared/filterHelper";
import {
  orderCustomerSearchableFields,
  orderSearchableFields,
  orderSortableFields,
  orderTransactionSearchableFields,
} from "./order.constant";
import {
  TAssignCourierPayload,
  TCheckCheckoutStockItem,
  TCheckCheckoutStockResponse,
  TCheckStockIssue,
  TCreateOrderPayload,
  TOrderFilterRequest,
  TUpdateOrderPaymentPayload,
  TUpdateOrderStatusPayload,
} from "./order.interface";
import { ActivityLogService } from "../ActivityLog/activityLog.service";

// ==================== ORDER NUMBER GENERATOR ====================
// Generates unique order number: TC-XXXXX (e.g. TC-94281)
const generateUniqueOrderNumber = async (): Promise<string> => {
  for (let i = 0; i < 10; i++) {
    const randomNum = Math.floor(10000 + Math.random() * 90000); // 5 digits (10000-99999)
    const orderNumber = `TC-${randomNum}`;
    const existing = await prisma.order.findUnique({
      where: { orderNumber },
      select: { id: true },
    });
    if (!existing) {
      return orderNumber;
    }
  }
  // Fallback with timestamp slice
  return `TC-${Date.now().toString().slice(-5)}`;
};

const defaultOrderInclude = {
  items: true,
  customerDetails: true,
  transactions: true,
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
};

// ==================== CREATE ORDER (CHECKOUT) ====================
const createOrder = async (
  payload: TCreateOrderPayload,
  authUser?: { id: string; role: string; email?: string; name?: string },
) => {
  const { items, customerDetails, transaction, deliveryFee = 0, discount = 0, couponCode } = payload;

  if (!items || items.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, "Cannot place an order with zero items");
  }

  // Calculate Subtotal from snapshots
  const subtotal = items.reduce((acc, item) => {
    const itemSub = item.unitPrice * item.quantity;
    return acc + itemSub;
  }, 0);

  const total = Math.max(0, subtotal + deliveryFee - discount);
  const orderNumber = await generateUniqueOrderNumber();

  const customerId = authUser?.role === "CUSTOMER" ? authUser.id : null;

  // Determine payment status
  const paymentMethod = transaction?.paymentMethod || "cod";
  const isCOD = paymentMethod.toLowerCase() === "cod";
  const initialPaymentStatus: PaymentStatus = isCOD ? PaymentStatus.UNPAID : PaymentStatus.PAID;
  const initialTrxStatus = isCOD ? "unpaid" : transaction?.trxId ? "verified" : "pending_verification";

  // Execute in Prisma Interactive Transaction
  const createdOrder = await prisma.$transaction(async (tx) => {
    // 1. Create Order master record
    const order = await tx.order.create({
      data: {
        orderNumber,
        customerId,
        status: OrderStatus.PENDING,
        paymentStatus: initialPaymentStatus,
        subtotal,
        deliveryFee,
        discount,
        couponCode: couponCode || null,
        total,
        estimatedDelivery:
          customerDetails.zone === "inside-dhaka"
            ? "Tomorrow (within 24h)"
            : "Within 2-3 Days",
        courierName:
          customerDetails.zone === "inside-dhaka"
            ? "Telos Express BD"
            : "Steadfast Courier",
      },
    });

    // 2. Batch Create OrderItem snapshots in 1 single query
    await tx.orderItem.createMany({
      data: items.map((item) => ({
        orderId: order.id,
        productId: item.productId || null,
        variantId: item.variantId || null,
        productName: item.productName,
        productThumbnail: item.productThumbnail || null,
        productSku: item.productSku || null,
        variantName: item.variantName || null,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.unitPrice * item.quantity,
      })),
    });

    // 3. Atomically decrement stock & create audit log if productId exists
    for (const item of items) {
      if (item.productId) {
        const prod = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (prod) {
          const currentStock = prod.stock;
          const newStock = Math.max(0, currentStock - item.quantity);
          const newStockStatus =
            newStock <= 0
              ? StockStatus.OUT_OF_STOCK
              : newStock <= prod.lowStockThreshold
                ? StockStatus.LOW_STOCK
                : StockStatus.IN_STOCK;

          await tx.product.update({
            where: { id: prod.id },
            data: {
              stock: newStock,
              stockStatus: newStockStatus,
            },
          });

          // Stock audit log
          await tx.stockAuditLog.create({
            data: {
              productId: prod.id,
              actionType: "DECREASE",
              quantity: item.quantity,
              previousStock: currentStock,
              newStock,
              reason: "ORDER_PLACED",
              note: `Order #${orderNumber}`,
              performedBy: authUser?.name || customerDetails.name,
            },
          });
        }
      }
    }

    // 4. Create OrderCustomerDetails snapshot (Frozen in time)
    await tx.orderCustomerDetails.create({
      data: {
        orderId: order.id,
        name: customerDetails.name,
        phone: customerDetails.phone,
        email: customerDetails.email || null,
        street: customerDetails.street,
        area: customerDetails.area || null,
        union: customerDetails.union || null,
        city: customerDetails.city,
        zone: customerDetails.zone,
        postalCode: customerDetails.postalCode || null,
        label: customerDetails.label || "Home",
        deliveryNote: customerDetails.deliveryNote || null,
      },
    });

    // 5. Create OrderTransaction
    await tx.orderTransaction.create({
      data: {
        orderId: order.id,
        paymentMethod,
        trxId: transaction?.trxId || null,
        mfsNumber: transaction?.mfsNumber || null,
        amount: total,
        status: initialTrxStatus,
      },
    });

    // 6. Clear customer cart if authenticated
    if (customerId) {
      await tx.cartItem.deleteMany({
        where: { customerId },
      });
    }

    // Return complete created order
    return await tx.order.findUniqueOrThrow({
      where: { id: order.id },
      include: defaultOrderInclude,
    });
  },
  {
    maxWait: 10000,
    timeout: 30000,
  });

  ActivityLogService.logActivity({
    actorName: customerDetails.name || "Customer",
    actorEmail: customerDetails.email || authUser?.email || "customer@teloscart.website",
    actorRole: authUser?.role === "CUSTOMER" ? "Customer" : "Guest Buyer",
    action: "New Order Placed",
    entity: `Order #${createdOrder.orderNumber}`,
    entityId: createdOrder.orderNumber,
    category: "ORDERS",
    severity: "SUCCESS",
    details: `Order #${createdOrder.orderNumber} placed for BDT ${Number(total).toLocaleString("en-BD", { minimumFractionDigits: 2 })} with ${items.length} item(s). Zone: ${customerDetails.zone}.`,
  });

  return createdOrder;
};

// ==================== GET MY ORDERS (CUSTOMER) ====================
const getMyOrders = async (
  customerId: string,
  filters: { status?: OrderStatus },
  paginationOptions?: IPaginationOptions,
) => {
  const { page, limit, skip } = calculatePagination(paginationOptions);

  const whereConditions: Prisma.OrderWhereInput = {
    customerId,
    ...(filters.status ? { status: filters.status } : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: defaultOrderInclude,
    }),
    prisma.order.count({ where: whereConditions }),
  ]);

  return {
    meta: buildPaginationMeta(page, limit, total),
    data: orders,
  };
};

// ==================== GET MY SINGLE ORDER (CUSTOMER) ====================
const getMyOrderById = async (customerId: string, orderIdOrNumber: string) => {
  const order = await prisma.order.findFirst({
    where: {
      customerId,
      OR: [{ id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }],
    },
    include: defaultOrderInclude,
  });

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Order not found");
  }

  return order;
};

// ==================== CANCEL MY ORDER (CUSTOMER) ====================
const cancelMyOrder = async (
  customerId: string,
  orderIdOrNumber: string,
  reason?: string,
) => {
  const order = await prisma.order.findFirst({
    where: {
      customerId,
      OR: [{ id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }],
    },
    include: { items: true },
  });

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Order not found");
  }

  if (order.status !== OrderStatus.PENDING) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot cancel order that is already in ${order.status} state. Contact customer support.`,
    );
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Update order status
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CANCELLED,
        cancelReason: reason || "Customer requested cancellation",
      },
      include: defaultOrderInclude,
    });

    // 2. Restore inventory for items with productId
    for (const item of order.items) {
      if (item.productId) {
        const prod = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (prod) {
          const currentStock = prod.stock;
          const newStock = currentStock + item.quantity;
          const newStockStatus =
            newStock <= 0
              ? StockStatus.OUT_OF_STOCK
              : newStock <= prod.lowStockThreshold
                ? StockStatus.LOW_STOCK
                : StockStatus.IN_STOCK;

          await tx.product.update({
            where: { id: prod.id },
            data: {
              stock: newStock,
              stockStatus: newStockStatus,
            },
          });

          await tx.stockAuditLog.create({
            data: {
              productId: prod.id,
              actionType: "INCREASE",
              quantity: item.quantity,
              previousStock: currentStock,
              newStock,
              reason: "ORDER_CANCELLED",
              note: `Order #${order.orderNumber} cancelled by customer`,
              performedBy: "Customer",
            },
          });
        }
      }
    }

    return updated;
  },
  {
    maxWait: 10000,
    timeout: 30000,
  });
};

// ==================== GET ALL ORDERS (ADMIN) ====================
const getAllOrders = async (
  filters: TOrderFilterRequest,
  paginationOptions?: IPaginationOptions,
  sortOptions?: ISortOptions,
) => {
  const { page, limit, skip } = calculatePagination(paginationOptions);
  const andConditions: Prisma.OrderWhereInput[] = [];

  // Search filter across orderNumber, trackingNumber, customer details, and trxId
  if (filters.searchTerm) {
    const term = filters.searchTerm.trim();
    andConditions.push({
      OR: [
        { orderNumber: { contains: term, mode: "insensitive" } },
        { trackingNumber: { contains: term, mode: "insensitive" } },
        { courierName: { contains: term, mode: "insensitive" } },
        {
          customerDetails: {
            OR: [
              { name: { contains: term, mode: "insensitive" } },
              { phone: { contains: term, mode: "insensitive" } },
              { email: { contains: term, mode: "insensitive" } },
              { city: { contains: term, mode: "insensitive" } },
              { street: { contains: term, mode: "insensitive" } },
            ],
          },
        },
        {
          transactions: {
            some: {
              OR: [
                { trxId: { contains: term, mode: "insensitive" } },
                { mfsNumber: { contains: term, mode: "insensitive" } },
                { paymentMethod: { contains: term, mode: "insensitive" } },
              ],
            },
          },
        },
      ],
    });
  }

  if (filters.status) {
    andConditions.push({ status: filters.status });
  }

  if (filters.paymentStatus) {
    andConditions.push({ paymentStatus: filters.paymentStatus });
  }

  if (filters.customerId) {
    andConditions.push({ customerId: filters.customerId });
  }

  if (filters.startDate || filters.endDate) {
    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (filters.startDate) createdAtFilter.gte = new Date(filters.startDate);
    if (filters.endDate) createdAtFilter.lte = new Date(filters.endDate);
    andConditions.push({ createdAt: createdAtFilter });
  }

  const whereConditions: Prisma.OrderWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const orderBy = buildSortOrder(sortOptions, orderSortableFields, "createdAt", "desc");

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      include: defaultOrderInclude,
    }),
    prisma.order.count({ where: whereConditions }),
  ]);

  return {
    meta: buildPaginationMeta(page, limit, total),
    data: orders,
  };
};

// ==================== GET ORDER BY ID OR NUMBER (ADMIN) ====================
const getOrderById = async (orderIdOrNumber: string) => {
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { id: orderIdOrNumber },
        { orderNumber: orderIdOrNumber },
        { orderNumber: orderIdOrNumber.toUpperCase() },
      ],
    },
    include: defaultOrderInclude,
  });

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, `Order "${orderIdOrNumber}" not found`);
  }

  return order;
};

// ==================== UPDATE ORDER STATUS (ADMIN) ====================
const updateOrderStatus = async (
  orderIdOrNumber: string,
  payload: TUpdateOrderStatusPayload,
  adminUser?: { name?: string; email?: string },
) => {
  const order = await prisma.order.findFirst({
    where: {
      OR: [{ id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }],
    },
    include: { items: true },
  });

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Order not found");
  }

  const previousStatus = order.status;
  const newStatus = payload.status;

  return await prisma.$transaction(async (tx) => {
    // If transitioning to CANCELLED and was not already cancelled, restore inventory
    if (newStatus === OrderStatus.CANCELLED && previousStatus !== OrderStatus.CANCELLED) {
      for (const item of order.items) {
        if (item.productId) {
          const prod = await tx.product.findUnique({
            where: { id: item.productId },
          });
          if (prod) {
            const currentStock = prod.stock;
            const newStock = currentStock + item.quantity;
            const newStockStatus =
              newStock <= 0
                ? StockStatus.OUT_OF_STOCK
                : newStock <= prod.lowStockThreshold
                  ? StockStatus.LOW_STOCK
                  : StockStatus.IN_STOCK;

            await tx.product.update({
              where: { id: prod.id },
              data: {
                stock: newStock,
                stockStatus: newStockStatus,
              },
            });

            await tx.stockAuditLog.create({
              data: {
                productId: prod.id,
                actionType: "INCREASE",
                quantity: item.quantity,
                previousStock: currentStock,
                newStock,
                reason: "ORDER_CANCELLED",
                note: `Order #${order.orderNumber} cancelled by admin`,
                performedBy: adminUser?.name || adminUser?.email || "Admin",
              },
            });
          }
        }
      }
    }

    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        status: newStatus,
        cancelReason: payload.cancelReason || order.cancelReason,
      },
      include: defaultOrderInclude,
    });

    ActivityLogService.logActivity({
      actorName: adminUser?.name || "Super Admin",
      actorEmail: adminUser?.email || "admin@teloscart.website",
      actorRole: "System Administrator",
      action: `Order Status ${newStatus}`,
      entity: `Order #${order.orderNumber}`,
      entityId: order.orderNumber,
      category: "ORDERS",
      severity: newStatus === OrderStatus.CANCELLED ? "DANGER" : "SUCCESS",
      details: `Transitioned order status from ${previousStatus} to ${newStatus}.${payload.cancelReason ? ` Reason: ${payload.cancelReason}` : ""}`,
    });

    return updatedOrder;
  },
  {
    maxWait: 10000,
    timeout: 30000,
  });
};

// ==================== ASSIGN COURIER TRACKING (ADMIN) ====================
const assignCourierTracking = async (
  orderIdOrNumber: string,
  payload: TAssignCourierPayload,
) => {
  const order = await prisma.order.findFirst({
    where: {
      OR: [{ id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }],
    },
  });

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Order not found");
  }

  // Assign courier and update status to SHIPPED if not already DELIVERED
  const updatedStatus =
    order.status === OrderStatus.DELIVERED ? OrderStatus.DELIVERED : OrderStatus.SHIPPED;

  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      courierName: payload.courierName,
      trackingNumber: payload.trackingNumber,
      estimatedDelivery: payload.estimatedDelivery || order.estimatedDelivery,
      status: updatedStatus,
    },
    include: defaultOrderInclude,
  });

  ActivityLogService.logActivity({
    actorName: "Operations Lead",
    actorEmail: "ops@teloscart.website",
    actorRole: "Dispatcher",
    action: "Order Status Dispatched",
    entity: `Order #${order.orderNumber}`,
    entityId: order.orderNumber,
    category: "ORDERS",
    severity: "SUCCESS",
    details: `Assigned ${payload.courierName} tracking code ${payload.trackingNumber}. Estimated: ${payload.estimatedDelivery || order.estimatedDelivery || "Standard"}.`,
  });

  return updatedOrder;
};

// ==================== UPDATE ORDER PAYMENT (ADMIN) ====================
const updateOrderPayment = async (
  orderIdOrNumber: string,
  payload: TUpdateOrderPaymentPayload,
) => {
  const order = await prisma.order.findFirst({
    where: {
      OR: [{ id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }],
    },
    include: { transactions: true },
  });

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Order not found");
  }

  const updatedOrder = await prisma.$transaction(async (tx) => {
    if (payload.paymentStatus) {
      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: payload.paymentStatus },
      });
    }

    if (order.transactions.length > 0) {
      const firstTrx = order.transactions[0];
      await tx.orderTransaction.update({
        where: { id: firstTrx.id },
        data: {
          status: payload.transactionStatus || firstTrx.status,
          trxId: payload.trxId || firstTrx.trxId,
          note: payload.note || firstTrx.note,
        },
      });
    }

    return await tx.order.findUniqueOrThrow({
      where: { id: order.id },
      include: defaultOrderInclude,
    });
  },
  {
    maxWait: 10000,
    timeout: 30000,
  });

  ActivityLogService.logActivity({
    actorName: "Super Admin",
    actorEmail: "admin@teloscart.website",
    actorRole: "System Administrator",
    action: "Updated Order Payment Status",
    entity: `Order #${order.orderNumber}`,
    entityId: order.orderNumber,
    category: "PAYMENTS",
    severity: payload.paymentStatus === PaymentStatus.PAID ? "SUCCESS" : "INFO",
    details: `Payment status updated to ${payload.paymentStatus || "adjusted"} for order #${order.orderNumber}.`,
  });

  return updatedOrder;
};

// ==================== GET ORDER KPI SUMMARY (ADMIN) ====================
const getOrderStats = async () => {
  const [
    totalOrders,
    pendingOrders,
    processingOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
    revenueAgg,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: OrderStatus.PENDING } }),
    prisma.order.count({ where: { status: OrderStatus.PROCESSING } }),
    prisma.order.count({ where: { status: OrderStatus.SHIPPED } }),
    prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
    prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),
    prisma.order.aggregate({
      where: { status: { not: OrderStatus.CANCELLED } },
      _sum: { total: true },
    }),
  ]);

  const totalRevenue = revenueAgg._sum.total ? Number(revenueAgg._sum.total) : 0;
  const pendingDispatchCount = pendingOrders + processingOrders;

  return {
    totalOrders,
    pendingOrders,
    processingOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
    pendingDispatchCount,
    totalRevenue,
  };
};

// ==================== VALIDATE CHECKOUT STOCK (PRE-FLIGHT CHECK) ====================
const validateCheckoutStock = async (
  items: TCheckCheckoutStockItem[],
): Promise<TCheckCheckoutStockResponse> => {
  if (!items || items.length === 0) {
    return { allValid: true, issues: [] };
  }

  const productIds = Array.from(
    new Set(items.map((i) => i.productId).filter((id): id is string => Boolean(id))),
  );
  const variantIds = Array.from(
    new Set(items.map((i) => i.variantId).filter((v): v is string => Boolean(v))),
  );

  // High-speed direct DB query
  const [products, variants] = await Promise.all([
    prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      select: {
        id: true,
        name: true,
        stock: true,
        stockStatus: true,
        isActive: true,
        isDeleted: true,
      },
    }),
    variantIds.length > 0
      ? prisma.productVariant.findMany({
          where: {
            id: { in: variantIds },
          },
          select: {
            id: true,
            productId: true,
            stock: true,
            isDeleted: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const productMap = new Map(products.map((p) => [p.id, p]));
  const variantMap = new Map(variants.map((v) => [v.id, v]));

  const issues: TCheckStockIssue[] = [];

  for (const item of items) {
    const qty = Number(item.quantity) || 1;
    const prod = productMap.get(item.productId);

    // 1. Missing or Soft-Deleted Product
    if (!prod || prod.isDeleted) {
      issues.push({
        productId: item.productId,
        variantId: item.variantId || null,
        productName: prod?.name || "Product Item",
        requestedQuantity: qty,
        availableStock: 0,
        issueType: "NOT_FOUND",
        message: `"${prod?.name || "This item"}" is no longer available in store.`,
      });
      continue;
    }

    // 2. Inactive / Deactivated Product
    if (!prod.isActive) {
      issues.push({
        productId: item.productId,
        variantId: item.variantId || null,
        productName: prod.name,
        requestedQuantity: qty,
        availableStock: 0,
        issueType: "INACTIVE",
        message: `"${prod.name}" is currently unavailable or deactivated.`,
      });
      continue;
    }

    // 3. Variant Stock Verification (if applicable)
    if (item.variantId) {
      const variant = variantMap.get(item.variantId);
      if (!variant || variant.isDeleted) {
        issues.push({
          productId: item.productId,
          variantId: item.variantId,
          productName: prod.name,
          requestedQuantity: qty,
          availableStock: 0,
          issueType: "NOT_FOUND",
          message: `The selected variant for "${prod.name}" is no longer available.`,
        });
        continue;
      }

      if (variant.stock <= 0) {
        issues.push({
          productId: item.productId,
          variantId: item.variantId,
          productName: prod.name,
          requestedQuantity: qty,
          availableStock: 0,
          issueType: "OUT_OF_STOCK",
          message: `The selected variant for "${prod.name}" is completely out of stock.`,
        });
        continue;
      }

      if (variant.stock < qty) {
        issues.push({
          productId: item.productId,
          variantId: item.variantId,
          productName: prod.name,
          requestedQuantity: qty,
          availableStock: variant.stock,
          issueType: "INSUFFICIENT_STOCK",
          message: `Only ${variant.stock} unit(s) available for "${prod.name}" (variant). You requested ${qty}.`,
        });
        continue;
      }
    }

    // 4. Product General Stock Verification
    if (prod.stock <= 0 || prod.stockStatus === StockStatus.OUT_OF_STOCK) {
      issues.push({
        productId: item.productId,
        variantId: item.variantId || null,
        productName: prod.name,
        requestedQuantity: qty,
        availableStock: 0,
        issueType: "OUT_OF_STOCK",
        message: `"${prod.name}" is out of stock.`,
      });
      continue;
    }

    if (prod.stock < qty) {
      issues.push({
        productId: item.productId,
        variantId: item.variantId || null,
        productName: prod.name,
        requestedQuantity: qty,
        availableStock: prod.stock,
        issueType: "INSUFFICIENT_STOCK",
        message: `Only ${prod.stock} unit(s) available for "${prod.name}". You requested ${qty}.`,
      });
      continue;
    }
  }

  return {
    allValid: issues.length === 0,
    issues,
  };
};

export const OrderService = {
  createOrder,
  validateCheckoutStock,
  getMyOrders,
  getMyOrderById,
  cancelMyOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  assignCourierTracking,
  updateOrderPayment,
  getOrderStats,
};

