import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ReviewController } from "./review.controller";
import { ReviewValidation } from "./review.validation";

const router = Router();

// Public: get reviews for a product
router.get("/product/:productId", ReviewController.getProductReviews);

// Customer only: submit a review
router.post(
  "/",
  auth("CUSTOMER"),
  validateRequest(ReviewValidation.createReviewValidationSchema),
  ReviewController.createReview,
);

export const ReviewRoutes = router;
