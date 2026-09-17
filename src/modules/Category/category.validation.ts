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

const createCategoryValidationSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Category name is required" }).trim().min(2),
    description: z.string().trim().max(500).optional(),
    icon: optionalString,
    subCategories: z.union([z.string(), z.array(z.any())]).optional(),
    isActive: optionalBoolean,
    isFeaturedHomepage: optionalBoolean,
  }),
});

const updateCategoryValidationSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).optional(),
    description: z.string().trim().max(500).optional(),
    icon: optionalString,
    subCategories: z.union([z.string(), z.array(z.any())]).optional(),
    isActive: optionalBoolean,
    isFeaturedHomepage: optionalBoolean,
    removeImage: optionalBoolean,
  }),
});

const createSubCategoryValidationSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Subcategory name is required" }).trim().min(2),
    description: z.string().trim().max(500).optional(),
    isActive: optionalBoolean,
  }),
});

const updateSubCategoryValidationSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).optional(),
    description: z.string().trim().max(500).optional(),
    isActive: optionalBoolean,
  }),
});

export const CategoryValidation = {
  createCategoryValidationSchema,
  updateCategoryValidationSchema,
  createSubCategoryValidationSchema,
  updateSubCategoryValidationSchema,
};
