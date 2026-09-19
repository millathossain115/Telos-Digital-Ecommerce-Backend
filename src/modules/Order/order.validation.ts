import { z } from "zod";
import { OrderStatus, PaymentStatus } from "@prisma/client";

const createOrderItemSchema = z.object({
  productId: z.string().optional(),
  variantId: z.string().optional(),
  productName: z.string({ required_error: "Product name is required" }).min(1),
  productThumbnail: z.string().optional().nullable(),
  productSku: z.string().optional().nullable(),
  variantName: z.string().optional().nullable(),
  unitPrice: z.number({ required_error: "Unit price is required" }).min(0),
  quantity: z.number({ required_error: "Quantity is required" }).int().positive(),
});

const createOrderCustomerDetailsSchema = z.object({
  name: z.string({ required_error: "Recipient name is required" }).min(1),
  phone: z.string({ required_error: "Recipient phone is required" }).min(1),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  street: z.string({ required_error: "Street address is required" }).min(1),
  area: z.string().optional().nullable(),
  union: z.string().optional().nullable(),
  city: z.string({ required_error: "City is required" }).min(1),
  zone: z.enum(["inside-dhaka", "outside-dhaka"]).default("inside-dhaka"),
  postalCode: z.string().optional().nullable(),
  label: z.string().optional().nullable(),
  deliveryNote: z.string().optional().nullable(),
});

const createOrderTransactionSchema = z.object({
  paymentMethod: z.string({ required_error: "Payment method is required" }).min(1),
  trxId: z.string().optional().nullable(),
  mfsNumber: z.string().optional().nullable(),
  amount: z.number().min(0).optional(),
});

const createOrderValidationSchema = z.object({
  body: z.object({
    items: z.array(createOrderItemSchema).min(1, "At least one order item is required"),
    customerDetails: createOrderCustomerDetailsSchema,
    transaction: createOrderTransactionSchema.optional(),
    deliveryFee: z.number().min(0).optional().default(0),
    discount: z.number().min(0).optional().default(0),
    couponCode: z.string().optional().nullable(),
  }),
});

const updateOrderStatusValidationSchema = z.object({
  body: z.object({
    status: z.nativeEnum(OrderStatus, {
      required_error: "Valid order status is required",
    }),
    cancelReason: z.string().optional(),
  }),
});

const assignCourierValidationSchema = z.object({
  body: z.object({
    courierName: z.string({ required_error: "Courier name is required" }).min(1),
    trackingNumber: z.string({ required_error: "Tracking number is required" }).min(1),
    estimatedDelivery: z.string().optional().nullable(),
  }),
});

const updateOrderPaymentValidationSchema = z.object({
  body: z.object({
    paymentStatus: z.nativeEnum(PaymentStatus).optional(),
    transactionStatus: z.string().optional(),
    trxId: z.string().optional(),
    note: z.string().optional(),
  }),
});

const cancelMyOrderValidationSchema = z.object({
  body: z.object({
    reason: z.string().optional(),
  }),
});

export const OrderValidation = {
  createOrderValidationSchema,
  updateOrderStatusValidationSchema,
  assignCourierValidationSchema,
  updateOrderPaymentValidationSchema,
  cancelMyOrderValidationSchema,
};
