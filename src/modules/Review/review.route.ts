import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ReviewController } from "./review.controller";
import { ReviewValidation } from "./review.validation";

const router = Router();

// ==================== ADMIN ROUTES ====================
// Get all reviews for admin with full-text search, status/rating filters, and pagination
router.get("/admin", auth("SUPER_ADMIN"), ReviewController.getAllReviewsAdmin);

// Get review metrics summary for admin KPI cards
router.get("/admin/summary", auth("SUPER_ADMIN"), ReviewController.getReviewsSummaryAdmin);

// Toggle review visibility / moderation status
router.patch(
  "/admin/:id/visibility",
  auth("SUPER_ADMIN"),
  validateRequest(ReviewValidation.updateReviewStatusValidationSchema),
  ReviewController.toggleReviewVisibilityAdmin,
);

// Soft delete review
router.delete("/admin/:id", auth("SUPER_ADMIN"), ReviewController.deleteReviewAdmin);

// ==================== PUBLIC / CUSTOMER ROUTES ====================
// Public: get reviews for a product (only visible & published)
router.get("/product/:productId", ReviewController.getProductReviews);

// Customer only: submit a review
router.post(
  "/",
  auth("CUSTOMER"),
  validateRequest(ReviewValidation.createReviewValidationSchema),
  ReviewController.createReview,
);

export const ReviewRoutes = router;
