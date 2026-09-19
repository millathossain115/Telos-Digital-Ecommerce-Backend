import { z } from "zod";

const verifyPaymentValidationSchema = z.object({
  body: z.object({
    status: z.enum(["verified", "rejected", "pending", "settled"]),
    note: z.string().optional(),
  }),
});

export const PaymentValidation = {
  verifyPaymentValidationSchema,
};
