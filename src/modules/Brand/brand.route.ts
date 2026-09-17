import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { BrandController } from "./brand.controller";
import brandImageUpload from "./brand.middleware";
import { BrandValidation } from "./brand.validation";

const router = Router();

router.get("/marquee", BrandController.getMarqueeBrands);

router.post(
  "/",
  auth("SUPER_ADMIN"),
  brandImageUpload.single("image"),
  validateRequest(BrandValidation.createBrandValidationSchema),
  BrandController.createBrand,
);

router.get("/", auth("SUPER_ADMIN"), BrandController.getAllBrands);
router.get("/slug/:slug", BrandController.getBrandBySlug);
router.get("/:id", auth("SUPER_ADMIN"), BrandController.getBrandById);

router.patch(
  "/:id",
  auth("SUPER_ADMIN"),
  brandImageUpload.single("image"),
  validateRequest(BrandValidation.updateBrandValidationSchema),
  BrandController.updateBrand,
);

router.delete("/:id", auth("SUPER_ADMIN"), BrandController.deleteBrand);

export const BrandRoutes = router;
