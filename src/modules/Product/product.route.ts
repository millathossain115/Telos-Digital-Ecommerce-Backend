import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ProductController } from "./product.controller";
import { productFilesUpload } from "./product.middleware";
import { ProductValidation } from "./product.validation";

const router = Router();

// Public catalog routes
router.get("/", ProductController.getAllProducts);
router.get("/slug/:slug", ProductController.getProductBySlug);

// Super Admin catalog listing (includes drafts and inactive items)
router.get("/admin", auth("SUPER_ADMIN"), ProductController.getAllProductsAdmin);

// Create product (with multi-image upload & auto SKU)
router.post(
  "/",
  auth("SUPER_ADMIN"),
  productFilesUpload,
  validateRequest(ProductValidation.createProductValidationSchema),
  ProductController.createProduct,
);

// Detail, Update & Delete
router.get("/:id", ProductController.getProductById);

router.patch(
  "/:id",
  auth("SUPER_ADMIN"),
  productFilesUpload,
  validateRequest(ProductValidation.updateProductValidationSchema),
  ProductController.updateProduct,
);

router.delete("/:id", auth("SUPER_ADMIN"), ProductController.deleteProduct);

export const ProductRoutes = router;
