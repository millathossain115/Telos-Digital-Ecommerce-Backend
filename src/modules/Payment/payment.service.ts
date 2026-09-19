import { PaymentStatus, Prisma } from "@prisma/client";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
import {
  buildPaginationMeta,
  calculatePagination,
} from "../../shared/paginationHelper";
import {
  IPaymentFilterRequest,
  IPaymentStats,
  IPaymentTransactionResponse,
  IVerifyTransactionPayload,
} from "./payment.interface";
import { ActivityLogService } from "../ActivityLog/activityLog.service";

// Helper: Normalize payment method name for frontend UI
const normalizeMethod = (
  rawMethod?: string,
): "bkash" | "nagad" | "card" | "cod" => {
  const m = (rawMethod || "").toLowerCase();
  if (m.includes("bkash")) return "bkash";
  if (m.includes("nagad")) return "nagad";
  if (m.includes("card") || m.includes("visa") || m.includes("master")) return "card";
  return "cod";
};

// Helper: Normalize transaction status for frontend UI
const normalizeStatus = (
  rawStatus?: string,
): "verified" | "pending_verification" | "rejected" | "settled" => {
  const s = (rawStatus || "").toLowerCase();
  if (s === "verified" || s === "paid" || s === "success") return "verified";
  if (s === "rejected" || s === "failed") return "rejected";
  if (s === "settled") return "settled";
  return "pending_verification";
};

// ==================== 1. GET ALL TRANSACTIONS ====================
const getAllTransactions = async (filters: IPaymentFilterRequest) => {
  const { page, limit, skip } = calculatePagination({
    page: filters.page,
    limit: filters.limit || 8,
  });
  const sortBy = filters.sortBy || "createdAt";
  const sortOrder = (filters.sortOrder || "desc") as "asc" | "desc";

  const whereClause: Prisma.OrderTransactionWhereInput = {};

  // Status Filter
  if (filters.status && filters.status !== "all") {
    const s = filters.status.toLowerCase();
    if (s === "pending_verification" || s === "pending") {
      whereClause.status = { in: ["pending", "pending_verification"] };
    } else if (s === "verified" || s === "paid") {
      whereClause.status = { in: ["verified", "paid"] };
    } else if (s === "rejected") {
      whereClause.status = { in: ["rejected", "failed"] };
    } else if (s === "settled") {
      whereClause.status = { in: ["settled"] };
    } else {
      whereClause.status = { equals: filters.status, mode: "insensitive" };
    }
  }

  // Method Filter
  if (filters.method && filters.method !== "all") {
    whereClause.paymentMethod = { equals: filters.method, mode: "insensitive" };
  }

  // Search Term
  if (filters.searchTerm && filters.searchTerm.trim()) {
    const term = filters.searchTerm.trim();
    whereClause.OR = [
      { trxId: { contains: term, mode: "insensitive" } },
      { mfsNumber: { contains: term, mode: "insensitive" } },
      { order: { orderNumber: { contains: term, mode: "insensitive" } } },
      { order: { customerDetails: { name: { contains: term, mode: "insensitive" } } } },
      { order: { customerDetails: { phone: { contains: term, mode: "insensitive" } } } },
      { order: { customerDetails: { email: { contains: term, mode: "insensitive" } } } },
    ];
  }

  // Fetch paginated transactions and total count
  const [transactions, total] = await Promise.all([
    prisma.orderTransaction.findMany({
      where: whereClause,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            createdAt: true,
            customerDetails: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.orderTransaction.count({ where: whereClause }),
  ]);

  // Compute Overall KPI statistics across all transactions
  const allTxnsForStats = await prisma.orderTransaction.findMany({
    select: {
      amount: true,
      status: true,
    },
  });

  let totalVolume = 0;
  let verifiedVolume = 0;
  let pendingVolume = 0;
  let rejectedVolume = 0;
  let pendingCount = 0;

  allTxnsForStats.forEach((t) => {
    const amt = Number(t.amount);
    totalVolume += amt;
    const st = t.status.toLowerCase();
    if (st === "verified" || st === "paid") {
      verifiedVolume += amt;
    } else if (st === "rejected" || st === "failed") {
      rejectedVolume += amt;
    } else {
      pendingVolume += amt;
      pendingCount++;
    }
  });

  const stats: IPaymentStats = {
    totalVolume: Math.round(totalVolume * 100) / 100,
    verifiedVolume: Math.round(verifiedVolume * 100) / 100,
    pendingVolume: Math.round(pendingVolume * 100) / 100,
    rejectedVolume: Math.round(rejectedVolume * 100) / 100,
    totalCount: allTxnsForStats.length,
    pendingCount,
  };

  const mappedTransactions: IPaymentTransactionResponse[] = transactions.map((t) => ({
    id: t.id,
    orderId: t.orderId,
    orderNumber: t.order.orderNumber,
    customerName: t.order.customerDetails?.name || "Guest Customer",
    customerPhone: t.order.customerDetails?.phone || "N/A",
    customerEmail: t.order.customerDetails?.email || "customer@teloscart.website",
    amount: Number(t.amount),
    method: normalizeMethod(t.paymentMethod),
    trxId: t.trxId,
    mfsNumber: t.mfsNumber,
    date: t.createdAt.toISOString(),
    status: normalizeStatus(t.status),
    note: t.note,
  }));

  const meta = buildPaginationMeta(page, limit, total);

  return {
    meta,
    stats,
    transactions: mappedTransactions,
  };
};

// ==================== 2. VERIFY / REJECT TRANSACTION ====================
const verifyTransaction = async (
  transactionId: string,
  payload: IVerifyTransactionPayload,
) => {
  const existing = await prisma.orderTransaction.findUnique({
    where: { id: transactionId },
    include: { order: true },
  });

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment transaction not found");
  }

  const updated = await prisma.$transaction(async (tx) => {
    let orderPaymentStatus: PaymentStatus = existing.order.paymentStatus;
    let dbStatus = payload.status;

    if (payload.status === "verified") {
      orderPaymentStatus = PaymentStatus.PAID;
      dbStatus = "verified";
    } else if (payload.status === "rejected") {
      orderPaymentStatus = PaymentStatus.FAILED;
      dbStatus = "rejected";
    } else if (payload.status === "pending") {
      orderPaymentStatus = PaymentStatus.UNPAID;
      dbStatus = "pending";
    }

    // 1. Update Transaction
    const updatedTxn = await tx.orderTransaction.update({
      where: { id: transactionId },
      data: {
        status: dbStatus,
        ...(payload.note && { note: payload.note }),
      },
      include: {
        order: {
          include: { customerDetails: true },
        },
      },
    });

    // 2. Sync Order Payment Status
    await tx.order.update({
      where: { id: existing.orderId },
      data: { paymentStatus: orderPaymentStatus },
    });

    return updatedTxn;
  });

  const result = {
    id: updated.id,
    orderId: updated.orderId,
    orderNumber: updated.order.orderNumber,
    customerName: updated.order.customerDetails?.name || "Customer",
    customerPhone: updated.order.customerDetails?.phone || "N/A",
    customerEmail: updated.order.customerDetails?.email || "customer@teloscart.website",
    amount: Number(updated.amount),
    method: normalizeMethod(updated.paymentMethod),
    trxId: updated.trxId,
    mfsNumber: updated.mfsNumber,
    date: updated.createdAt.toISOString(),
    status: normalizeStatus(updated.status),
    note: updated.note,
  };

  ActivityLogService.logActivity({
    actorName: "Finance Desk",
    actorEmail: "billing@teloscart.website",
    actorRole: "Accounts Auditor",
    action:
      payload.status === "verified"
        ? `Verified ${result.method.toUpperCase()} Payment`
        : payload.status === "rejected"
          ? "Rejected Payment Transaction"
          : "Updated Payment Status",
    entity: result.trxId ? `Trx #${result.trxId}` : `Order #${result.orderNumber}`,
    entityId: result.trxId || result.orderNumber,
    category: "PAYMENTS",
    severity:
      payload.status === "verified"
        ? "SUCCESS"
        : payload.status === "rejected"
          ? "DANGER"
          : "WARNING",
    details: `Reconciled BDT ${result.amount.toLocaleString("en-BD", { minimumFractionDigits: 2 })} against order #${result.orderNumber} with ${result.method.toUpperCase()} gateway.${payload.note ? ` Note: ${payload.note}` : ""}`,
  });

  return result;
};

export const PaymentService = {
  getAllTransactions,
  verifyTransaction,
};
