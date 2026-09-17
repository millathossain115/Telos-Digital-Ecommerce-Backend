import { z } from "zod";

const optionalBoolean = z.preprocess((value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "1") return true;
  if (value === "0") return false;
  return value;
}, z.boolean().optional());

const optionalString = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) return undefined;
  return value;
}, z.string().trim().min(1).optional());

const createBrandValidationSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Brand name is required" }).trim().min(2),
    tagline: z.string().trim().max(200).optional(),
    description: z.string().trim().max(500).optional(),
    isActive: optionalBoolean,
    isFeaturedMarquee: optionalBoolean,
    imageUrl: optionalString,
  }),
});

const updateBrandValidationSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).optional(),
    tagline: z.string().trim().max(200).optional(),
    description: z.string().trim().max(500).optional(),
    isActive: optionalBoolean,
    isFeaturedMarquee: optionalBoolean,
    imageUrl: optionalString,
    removeImage: optionalBoolean,
  }),
});

export const BrandValidation = {
  createBrandValidationSchema,
  updateBrandValidationSchema,
};
