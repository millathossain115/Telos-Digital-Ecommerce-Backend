import { Prisma, ReviewStatus } from "@prisma/client";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
import {
  buildPaginationMeta,
  calculatePagination,
  IPaginationOptions,
} from "../../shared/paginationHelper";
import { ISortOptions } from "../../shared/filterHelper";
import {
  TAdminReviewFilterRequest,
  TCreateReviewPayload,
  TUpdateReviewStatusPayload,
} from "./review.interface";

const reviewInclude = {
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      thumbnail: true,
      price: true,
      rating: true,
      reviewCount: true,
    },
  },
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

// Helper: Recalculate product rating & review count for visible published reviews
const recalculateProductRating = async (productId: string) => {
  const aggregates = await prisma.review.aggregate({
    where: {
      productId,
      isDeleted: false,
      isVisible: true,
      status: ReviewStatus.PUBLISHED,
    },
    _avg: { rating: true },
    _count: { id: true },
  });

  await prisma.product.update({
    where: { id: productId },
    data: {
      rating: aggregates._avg.rating ? Number(aggregates._avg.rating.toFixed(1)) : 0,
      reviewCount: aggregates._count.id || 0,
    },
  });
};

// ==================== CREATE REVIEW (CUSTOMER) ====================
const createReview = async (customerId: string, payload: TCreateReviewPayload) => {
  const product = await prisma.product.findFirst({
    where: { id: payload.productId, isDeleted: false },
  });

  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, "Product not found or unavailable");
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, isDeleted: false },
  });

  if (!customer) {
    throw new AppError(httpStatus.NOT_FOUND, "Customer not found");
  }

  // Upsert review for this customer and product
  const review = await prisma.review.upsert({
    where: {
      productId_customerId: {
        productId: payload.productId,
        customerId,
      },
    },
    update: {
      rating: payload.rating,
      title: payload.title || null,
      comment: payload.comment || null,
      isVisible: true,
      status: ReviewStatus.PUBLISHED,
      isDeleted: false,
    },
    create: {
      productId: payload.productId,
      customerId,
      rating: payload.rating,
      title: payload.title || null,
      comment: payload.comment || null,
      isVerifiedPurchase: true,
      isVisible: true,
      status: ReviewStatus.PUBLISHED,
    },
    include: reviewInclude,
  });

  await recalculateProductRating(payload.productId);

  return review;
};

// ==================== GET PRODUCT REVIEWS (PUBLIC STOREFRONT) ====================
const getProductReviews = async (productId: string) => {
  const reviews = await prisma.review.findMany({
    where: {
      productId,
      isDeleted: false,
      isVisible: true,
      status: ReviewStatus.PUBLISHED,
    },
    orderBy: { createdAt: "desc" },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
    },
  });

  // Calculate rating breakdown distribution
  const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalScore = 0;

  for (const r of reviews) {
    if (r.rating >= 1 && r.rating <= 5) {
      breakdown[r.rating] = (breakdown[r.rating] || 0) + 1;
      totalScore += r.rating;
    }
  }

  const count = reviews.length;
  const averageRating = count > 0 ? Number((totalScore / count).toFixed(1)) : 0;

  return {
    averageRating,
    totalReviews: count,
    breakdown,
    data: reviews,
  };
};

// ==================== GET ALL REVIEWS (ADMIN DASHBOARD) ====================
const getAllReviewsAdmin = async (
  filters: TAdminReviewFilterRequest,
  paginationOptions: IPaginationOptions,
  sortOptions?: ISortOptions,
) => {
  const pagination = calculatePagination(paginationOptions);
  const { limit, skip } = pagination;

  const andConditions: Prisma.ReviewWhereInput[] = [{ isDeleted: false }];

  // 1. Full-text search
  if (filters.searchTerm && filters.searchTerm.trim() !== "") {
    const term = filters.searchTerm.trim();
    andConditions.push({
      OR: [
        { title: { contains: term, mode: "insensitive" } },
        { comment: { contains: term, mode: "insensitive" } },
        { product: { name: { contains: term, mode: "insensitive" } } },
        { product: { sku: { contains: term, mode: "insensitive" } } },
        { customer: { name: { contains: term, mode: "insensitive" } } },
        { customer: { email: { contains: term, mode: "insensitive" } } },
      ],
    });
  }

  // 2. Status filter ("all", "published", "hidden", "flagged")
  if (filters.status && filters.status !== "all") {
    const normalized = filters.status.toUpperCase();
    if (Object.values(ReviewStatus).includes(normalized as ReviewStatus)) {
      andConditions.push({ status: normalized as ReviewStatus });
    }
  }

  // 3. Visibility filter
  if (filters.isVisible !== undefined && filters.isVisible !== "") {
    andConditions.push({
      isVisible: filters.isVisible === true || filters.isVisible === "true",
    });
  }

  // 4. Rating filter ("all", "1", "2", "3", "4", "5")
  if (filters.rating !== undefined && filters.rating !== "all" && filters.rating !== "") {
    const numRating = Number(filters.rating);
    if (!isNaN(numRating)) {
      andConditions.push({ rating: numRating });
    }
  }

  // 5. Product filter
  if (filters.productId) {
    andConditions.push({ productId: filters.productId });
  }

  // 6. Customer filter
  if (filters.customerId) {
    andConditions.push({ customerId: filters.customerId });
  }

  const whereConditions: Prisma.ReviewWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  // Sort logic
  let orderBy: Prisma.ReviewOrderByWithRelationInput = { createdAt: "desc" };
  const requestedSortBy = sortOptions?.sortBy || "createdAt";
  const requestedSortOrder = (sortOptions?.sortOrder || "desc") as Prisma.SortOrder;

  if (requestedSortBy === "rating") {
    orderBy = { rating: requestedSortOrder };
  } else if (requestedSortBy === "createdAt" || requestedSortBy === "date") {
    orderBy = { createdAt: requestedSortOrder };
  } else if (requestedSortBy === "updatedAt") {
    orderBy = { updatedAt: requestedSortOrder };
  }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      include: reviewInclude,
    }),
    prisma.review.count({ where: whereConditions }),
  ]);

  return {
    meta: buildPaginationMeta(pagination.page, pagination.limit, total),
    data: reviews,
  };
};

// ==================== GET REVIEWS SUMMARY (ADMIN KPI) ====================
const getReviewsSummaryAdmin = async () => {
  const [totalCount, avgAggregate, hiddenCount, flaggedCount, publishedCount] =
    await Promise.all([
      prisma.review.count({ where: { isDeleted: false } }),
      prisma.review.aggregate({
        where: { isDeleted: false },
        _avg: { rating: true },
      }),
      prisma.review.count({
        where: {
          isDeleted: false,
          OR: [{ status: ReviewStatus.HIDDEN }, { isVisible: false }],
        },
      }),
      prisma.review.count({
        where: { isDeleted: false, status: ReviewStatus.FLAGGED },
      }),
      prisma.review.count({
        where: {
          isDeleted: false,
          status: ReviewStatus.PUBLISHED,
          isVisible: true,
        },
      }),
    ]);

  const rawAvg = avgAggregate._avg.rating ?? 5.0;
  const avgRating = Number(rawAvg.toFixed(1));

  return {
    totalCount,
    avgRating,
    hiddenCount,
    flaggedCount,
    publishedCount,
  };
};

// ==================== TOGGLE REVIEW VISIBILITY / STATUS (ADMIN) ====================
const toggleReviewVisibilityAdmin = async (
  reviewId: string,
  payload: TUpdateReviewStatusPayload,
) => {
  const review = await prisma.review.findFirst({
    where: { id: reviewId, isDeleted: false },
  });

  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, "Review not found or has been deleted");
  }

  let nextStatus: ReviewStatus = review.status;
  let nextIsVisible: boolean = review.isVisible;

  if (payload.status) {
    const targetStatus = payload.status.toUpperCase() as ReviewStatus;
    if (Object.values(ReviewStatus).includes(targetStatus)) {
      nextStatus = targetStatus;
      nextIsVisible = targetStatus === ReviewStatus.PUBLISHED;
    }
  } else if (payload.isVisible !== undefined) {
    nextIsVisible = Boolean(payload.isVisible);
    nextStatus = nextIsVisible ? ReviewStatus.PUBLISHED : ReviewStatus.HIDDEN;
  } else {
    // Standard Toggle
    if (review.status === ReviewStatus.HIDDEN || !review.isVisible) {
      nextStatus = ReviewStatus.PUBLISHED;
      nextIsVisible = true;
    } else {
      nextStatus = ReviewStatus.HIDDEN;
      nextIsVisible = false;
    }
  }

  const updatedReview = await prisma.review.update({
    where: { id: reviewId },
    data: {
      status: nextStatus,
      isVisible: nextIsVisible,
    },
    include: reviewInclude,
  });

  // Recompute storefront ratings
  await recalculateProductRating(review.productId);

  return updatedReview;
};

// ==================== DELETE REVIEW (ADMIN SOFT DELETE) ====================
const deleteReviewAdmin = async (reviewId: string) => {
  const review = await prisma.review.findFirst({
    where: { id: reviewId, isDeleted: false },
  });

  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, "Review not found or already deleted");
  }

  const deletedReview = await prisma.review.update({
    where: { id: reviewId },
    data: {
      isDeleted: true,
      isVisible: false,
    },
    include: reviewInclude,
  });

  // Recompute storefront ratings
  await recalculateProductRating(review.productId);

  return deletedReview;
};

export const ReviewService = {
  createReview,
  getProductReviews,
  getAllReviewsAdmin,
  getReviewsSummaryAdmin,
  toggleReviewVisibilityAdmin,
  deleteReviewAdmin,
};
