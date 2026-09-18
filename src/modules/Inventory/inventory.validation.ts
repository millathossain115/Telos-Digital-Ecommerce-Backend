import { z } from "zod";
import { StockAdjustmentType } from "@prisma/client";

const adjustStockValidationSchema = z.object({
  body: z.object({
    productId: z.string({ required_error: "Product ID is required" }),
    actionType: z.nativeEnum(StockAdjustmentType, {
      required_error: "Action type must be INCREASE or DECREASE",
    }),
    quantity: z
      .number({ required_error: "Quantity must be a number" })
      .int("Quantity must be an integer")
      .positive("Quantity must be greater than 0"),
    reason: z
      .string({ required_error: "Adjustment reason is required" })
      .min(1, "Reason cannot be empty"),
    note: z.string().optional(),
  }),
});

export const InventoryValidation = {
  adjustStockValidationSchema,
};
