import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { CategoryController } from "./category.controller";
import categoryImageUpload from "./category.middleware";
import { CategoryValidation } from "./category.validation";

const router = Router();

router.get("/tree", CategoryController.getCategoryTree);
router.get("/featured-homepage", CategoryController.getFeaturedHomepageCategories);
router.get(
  "/parents",
  CategoryController.getParentCategories,
);

router.post(
  "/",
  auth("SUPER_ADMIN"),
  categoryImageUpload.single("image"),
  validateRequest(CategoryValidation.createCategoryValidationSchema),
  CategoryController.createCategory,
);

router.get("/", CategoryController.getAllCategories);
router.get("/slug/:slug", CategoryController.getCategoryBySlug);
router.post(
  "/:categoryId/sub-categories",
  auth("SUPER_ADMIN"),
  validateRequest(CategoryValidation.createSubCategoryValidationSchema),
  CategoryController.createSubCategory,
);
router.patch(
  "/sub-categories/:id",
  auth("SUPER_ADMIN"),
  validateRequest(CategoryValidation.updateSubCategoryValidationSchema),
  CategoryController.updateSubCategory,
);
router.delete(
  "/sub-categories/:id",
  auth("SUPER_ADMIN"),
  CategoryController.deleteSubCategory,
);
router.get("/:id", auth("SUPER_ADMIN"), CategoryController.getCategoryById);

router.patch(
  "/:id",
  auth("SUPER_ADMIN"),
  categoryImageUpload.single("image"),
  validateRequest(CategoryValidation.updateCategoryValidationSchema),
  CategoryController.updateCategory,
);

router.delete("/:id", auth("SUPER_ADMIN"), CategoryController.deleteCategory);

export const CategoryRoutes = router;
