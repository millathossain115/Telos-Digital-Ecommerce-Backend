import { z } from "zod";

const addToCartValidationSchema = z.object({
  body: z.object({
    productId: z.string({ required_error: "Product ID is required" }).uuid(),
    quantity: z.number().int().min(1).default(1),
    variantId: z.string().uuid().optional(),
  }),
});

const updateCartItemValidationSchema = z.object({
  body: z.object({
    quantity: z.number().int().min(0, "Quantity must be 0 or more"),
  }),
});

const adminBulkDeleteCartValidationSchema = z.object({
  body: z.object({
    ids: z.array(z.string().uuid()).min(1, "At least one item ID is required"),
  }),
});

export const CartValidation = {
  addToCartValidationSchema,
  updateCartItemValidationSchema,
  adminBulkDeleteCartValidationSchema,
};
