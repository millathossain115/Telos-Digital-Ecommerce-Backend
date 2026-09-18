import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { ReviewService } from "./review.service";

const createReview = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const result = await ReviewService.createReview(customerId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Review submitted successfully",
    data: result,
  });
});

const getProductReviews = catchAsync(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const result = await ReviewService.getProductReviews(productId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Product reviews retrieved successfully",
    data: result,
  });
});

const getAllReviewsAdmin = catchAsync(async (req: Request, res: Response) => {
  const {
    searchTerm,
    status,
    rating,
    productId,
    customerId,
    isVisible,
    page,
    limit,
    sortBy,
    sortOrder,
  } = req.query;

  const result = await ReviewService.getAllReviewsAdmin(
    {
      searchTerm: searchTerm as string,
      status: status as string,
      rating: rating as string,
      productId: productId as string,
      customerId: customerId as string,
      isVisible: isVisible as string,
    },
    { page: page as string, limit: limit as string },
    { sortBy: sortBy as string, sortOrder: sortOrder as string },
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reviews retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getReviewsSummaryAdmin = catchAsync(async (_req: Request, res: Response) => {
  const result = await ReviewService.getReviewsSummaryAdmin();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reviews summary retrieved successfully",
    data: result,
  });
});

const toggleReviewVisibilityAdmin = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ReviewService.toggleReviewVisibilityAdmin(id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Review visibility updated successfully",
    data: result,
  });
});

const deleteReviewAdmin = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ReviewService.deleteReviewAdmin(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Review deleted successfully",
    data: result,
  });
});

export const ReviewController = {
  createReview,
  getProductReviews,
  getAllReviewsAdmin,
  getReviewsSummaryAdmin,
  toggleReviewVisibilityAdmin,
  deleteReviewAdmin,
};
