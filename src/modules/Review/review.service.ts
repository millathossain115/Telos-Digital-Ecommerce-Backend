import httpStatus from "http-status";
import prisma from "../../lib/prisma";
import AppError from "../../errors/AppError";
import { TCreateReviewPayload } from "./review.interface";

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
      isDeleted: false,
    },
    create: {
      productId: payload.productId,
      customerId,
      rating: payload.rating,
      title: payload.title || null,
      comment: payload.comment || null,
      isVerifiedPurchase: true,
    },
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

  // Recalculate aggregates for the product
  const aggregates = await prisma.review.aggregate({
    where: { productId: payload.productId, isDeleted: false },
    _avg: { rating: true },
    _count: { id: true },
  });

  await prisma.product.update({
    where: { id: payload.productId },
    data: {
      rating: aggregates._avg.rating ? Number(aggregates._avg.rating.toFixed(1)) : 0,
      reviewCount: aggregates._count.id || 0,
    },
  });

  return review;
};

const getProductReviews = async (productId: string) => {
  const reviews = await prisma.review.findMany({
    where: { productId, isDeleted: false },
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

export const ReviewService = {
  createReview,
  getProductReviews,
};
