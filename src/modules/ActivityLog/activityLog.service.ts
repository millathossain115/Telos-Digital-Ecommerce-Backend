import { ActivityCategory, ActivitySeverity, Prisma } from "@prisma/client";
import { Request } from "express";
import prisma from "../../lib/prisma";
import {
  buildSortOrder,
  ISortOptions,
} from "../../shared/filterHelper";
import {
  buildPaginationMeta,
  calculatePagination,
  IPaginationOptions,
} from "../../shared/paginationHelper";
import { activityLogSortableFields } from "./activityLog.constant";
import {
  TActivityCategory,
  TActivityLogFilterRequest,
  TActivityLogResponse,
  TActivitySeverity,
  TActivitySummaryResponse,
  TCreateActivityLogPayload,
} from "./activityLog.interface";

// Helper: Normalize category string to Prisma enum
const mapToPrismaCategory = (cat?: string): ActivityCategory => {
  if (!cat) return ActivityCategory.CATALOG;
  const upper = cat.toUpperCase();
  if (upper === "AUTH") return ActivityCategory.AUTH;
  if (upper === "ORDERS") return ActivityCategory.ORDERS;
  if (upper === "PAYMENTS") return ActivityCategory.PAYMENTS;
  if (upper === "SECURITY") return ActivityCategory.SECURITY;
  if (upper === "SETTINGS") return ActivityCategory.SETTINGS;
  return ActivityCategory.CATALOG;
};

// Helper: Normalize severity string to Prisma enum
const mapToPrismaSeverity = (sev?: string): ActivitySeverity => {
  if (!sev) return ActivitySeverity.INFO;
  const upper = sev.toUpperCase();
  if (upper === "SUCCESS") return ActivitySeverity.SUCCESS;
  if (upper === "WARNING") return ActivitySeverity.WARNING;
  if (upper === "DANGER" || upper === "HIGH ALERT" || upper === "ERROR") {
    return ActivitySeverity.DANGER;
  }
  return ActivitySeverity.INFO;
};

// Helper: Clean and format User-Agent into human-readable device
const parseDevice = (userAgent?: string | null): string => {
  if (!userAgent) return "Chrome / Windows 11";
  const ua = userAgent.toLowerCase();

  let browser = "Browser";
  if (ua.includes("edg/")) browser = "Edge";
  else if (ua.includes("chrome") && !ua.includes("edg/")) browser = "Chrome";
  else if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";
  else if (ua.includes("postman")) browser = "Postman Runtime";
  else if (ua.includes("curl") || ua.includes("python")) browser = "API Client";

  let os = "Desktop";
  if (ua.includes("windows nt 10.0") || ua.includes("windows nt 11.0")) os = "Windows 11";
  else if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac os x")) os = "macOS";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";
  else if (ua.includes("linux")) os = "Linux";

  return `${browser} / ${os}`;
};

// ==================== 1. LOG ACTIVITY (UNIVERSAL HOOK) ====================
export const logActivity = async (
  payload: TCreateActivityLogPayload,
  req?: Request,
): Promise<void> => {
  try {
    let actorName = payload.actorName;
    let actorEmail = payload.actorEmail;
    let actorRole = payload.actorRole;
    let actorAvatar = payload.actorAvatar;
    let adminId = payload.adminId;

    // If request user exists and actor info was not fully provided, enrich from DB
    const reqUser = (req as any)?.user;
    if (reqUser) {
      if (!adminId && reqUser.role === "SUPER_ADMIN") {
        adminId = reqUser.id;
      }

      if (!actorEmail) {
        actorEmail = reqUser.email;
      }

      if (!actorRole) {
        actorRole = reqUser.role === "SUPER_ADMIN" ? "System Administrator" : "Customer";
      }

      if (!actorName && adminId) {
        const adminRecord = await prisma.admin.findUnique({
          where: { id: adminId },
          select: { name: true, avatar: true },
        });
        if (adminRecord) {
          actorName = adminRecord.name;
          actorAvatar = adminRecord.avatar;
        }
      }
    }

    // Default fallbacks
    actorName = actorName || "Super Admin";
    actorEmail = actorEmail || "admin@teloscart.website";
    actorRole = actorRole || "System Administrator";

    // Extract network & client origin
    let rawIp: string | undefined = payload.ipAddress || undefined;
    if (!rawIp && req) {
      const forwarded = req.headers["x-forwarded-for"];
      if (typeof forwarded === "string") {
        rawIp = forwarded.split(",")[0].trim();
      } else if (Array.isArray(forwarded) && forwarded.length > 0) {
        rawIp = forwarded[0].trim();
      } else {
        rawIp = req.socket?.remoteAddress || req.ip;
      }
    }

    // Sanitize IPv6 localhost
    if (rawIp === "::1" || rawIp === "::ffff:127.0.0.1") {
      rawIp = "127.0.0.1";
    }

    const device = payload.device || parseDevice(req?.headers["user-agent"]);
    const location =
      payload.location ||
      (req?.headers["cf-ipcountry"]
        ? `${req.headers["cf-ipcountry"]}, Cloudflare`
        : "Dhaka, Bangladesh");

    const category = mapToPrismaCategory(payload.category);
    const severity = mapToPrismaSeverity(payload.severity);

    await prisma.activityLog.create({
      data: {
        adminId: adminId || null,
        actorName,
        actorEmail,
        actorRole,
        actorAvatar: actorAvatar || null,
        action: payload.action,
        entity: payload.entity,
        entityId: payload.entityId || null,
        category,
        severity,
        details: payload.details,
        ipAddress: rawIp || "127.0.0.1",
        device,
        location,
        metadata: (payload.metadata as Prisma.InputJsonValue) || undefined,
      },
    });
  } catch (error) {
    // Audit logging is non-blocking: never crash primary customer/store flows
    console.warn("[ActivityLogService] Failed to record audit log:", error);
  }
};

// ==================== 2. GET ALL ACTIVITY LOGS (ADMIN) ====================
export const getAllActivityLogs = async (
  filters: TActivityLogFilterRequest,
  paginationOptions: IPaginationOptions,
  sortOptions: ISortOptions,
) => {
  const { page, limit, skip } = calculatePagination(paginationOptions);
  const andConditions: Prisma.ActivityLogWhereInput[] = [];

  // Search filter across action, entity, details, actorName, actorEmail, ipAddress
  if (filters.searchTerm && filters.searchTerm.trim()) {
    const term = filters.searchTerm.trim();
    andConditions.push({
      OR: [
        { action: { contains: term, mode: "insensitive" } },
        { entity: { contains: term, mode: "insensitive" } },
        { details: { contains: term, mode: "insensitive" } },
        { actorName: { contains: term, mode: "insensitive" } },
        { actorEmail: { contains: term, mode: "insensitive" } },
        { ipAddress: { contains: term, mode: "insensitive" } },
      ],
    });
  }

  // Category Filter
  if (filters.category && filters.category !== "all") {
    const cat = mapToPrismaCategory(filters.category);
    andConditions.push({ category: cat });
  }

  // Severity Filter
  if (filters.severity && filters.severity !== "all") {
    const sev = mapToPrismaSeverity(filters.severity);
    andConditions.push({ severity: sev });
  }

  // Date Range Filter
  if (filters.startDate || filters.endDate) {
    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (filters.startDate) createdAtFilter.gte = new Date(filters.startDate);
    if (filters.endDate) createdAtFilter.lte = new Date(filters.endDate);
    andConditions.push({ createdAt: createdAtFilter });
  }

  const whereConditions: Prisma.ActivityLogWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const orderBy = buildSortOrder(
    sortOptions,
    activityLogSortableFields,
    "createdAt",
    "desc",
  );

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
    }),
    prisma.activityLog.count({ where: whereConditions }),
  ]);

  const formattedLogs: TActivityLogResponse[] = logs.map((log) => ({
    id: log.id,
    timestamp: log.createdAt.toISOString(),
    actor: {
      name: log.actorName,
      email: log.actorEmail,
      role: log.actorRole,
      avatar: log.actorAvatar,
    },
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    category: log.category.toLowerCase() as TActivityCategory,
    severity: log.severity.toLowerCase() as TActivitySeverity,
    details: log.details,
    ipAddress: log.ipAddress || "127.0.0.1",
    device: log.device || "Chrome / Windows 11",
    location: log.location || "Dhaka, Bangladesh",
  }));

  return {
    meta: buildPaginationMeta(page, limit, total),
    data: formattedLogs,
  };
};

// ==================== 3. GET ACTIVITY SUMMARY (KPI COUNTERS) ====================
export const getActivitySummary = async (): Promise<TActivitySummaryResponse> => {
  const [totalCount, criticalCount, securityCount] = await Promise.all([
    prisma.activityLog.count(),
    prisma.activityLog.count({
      where: {
        severity: { in: [ActivitySeverity.WARNING, ActivitySeverity.DANGER] },
      },
    }),
    prisma.activityLog.count({
      where: {
        category: { in: [ActivityCategory.SECURITY, ActivityCategory.AUTH] },
      },
    }),
  ]);

  return {
    totalCount,
    criticalCount,
    securityCount,
  };
};

export const ActivityLogService = {
  logActivity,
  getAllActivityLogs,
  getActivitySummary,
};
