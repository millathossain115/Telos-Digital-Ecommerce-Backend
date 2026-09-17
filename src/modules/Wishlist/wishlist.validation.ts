import { z } from "zod";

const addToWishlistValidationSchema = z.object({
  body: z.object({
    productId: z.string({ required_error: "Product ID is required" }).uuid(),
  }),
});

const adminBulkDeleteWishlistValidationSchema = z.object({
  body: z.object({
    ids: z.array(z.string().uuid()).min(1, "At least one item ID is required"),
  }),
});

export const WishlistValidation = {
  addToWishlistValidationSchema,
  adminBulkDeleteWishlistValidationSchema,
};
