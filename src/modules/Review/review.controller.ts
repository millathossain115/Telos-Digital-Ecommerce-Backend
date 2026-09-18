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

export const ReviewController = {
  createReview,
  getProductReviews,
};
