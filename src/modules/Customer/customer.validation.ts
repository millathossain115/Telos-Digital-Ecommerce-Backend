import { z } from "zod";

const updateCustomerValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    avatar: z.string().url().optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  }),
});

const createAddressValidationSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    type: z.enum(["SHIPPING", "BILLING"]).optional(),
    isDefault: z.boolean().optional(),
    street: z.string({ required_error: "Street address is required" }),
    city: z.string({ required_error: "City is required" }),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }),
});

const updateAddressValidationSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    type: z.enum(["SHIPPING", "BILLING"]).optional(),
    isDefault: z.boolean().optional(),
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }),
});

export const CustomerValidation = {
  updateCustomerValidationSchema,
  createAddressValidationSchema,
  updateAddressValidationSchema,
};
