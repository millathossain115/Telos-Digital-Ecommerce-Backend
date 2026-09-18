import { z } from "zod";

const createReviewValidationSchema = z.object({
  body: z.object({
    productId: z.string({ required_error: "Product ID is required" }).uuid("Invalid product ID format"),
    rating: z
      .number({ required_error: "Rating is required" })
      .int("Rating must be an integer")
      .min(1, "Rating must be at least 1")
      .max(5, "Rating cannot exceed 5"),
    title: z.string().trim().max(100, "Title cannot exceed 100 characters").optional(),
    comment: z.string().trim().max(2000, "Comment cannot exceed 2000 characters").optional(),
  }),
});

export const ReviewValidation = {
  createReviewValidationSchema,
};
