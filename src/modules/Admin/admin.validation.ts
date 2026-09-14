import { z } from "zod";

const createAdminValidationSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Admin name is required" }),
    email: z
      .string({ required_error: "Email is required" })
      .email("Invalid email format"),
    password: z
      .string({ required_error: "Password is required" })
      .min(6, "Password must be at least 6 characters long"),
    phone: z.string().optional(),
    avatar: z.string().url().optional(),
  }),
});

const updateAdminValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    avatar: z.string().url().optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
    password: z.string().min(6).optional(),
  }),
});

export const AdminValidation = {
  createAdminValidationSchema,
  updateAdminValidationSchema,
};
