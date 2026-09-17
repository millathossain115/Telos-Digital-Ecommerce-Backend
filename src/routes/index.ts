import { Router } from "express";
import validateRequest from "../middlewares/validateRequest";
import { AdminRoutes } from "../modules/Admin/admin.route";
import { AuthController } from "../modules/Auth/auth.controller";
import { AuthRoutes } from "../modules/Auth/auth.route";
import { AuthValidation } from "../modules/Auth/auth.validation";
import { BrandRoutes } from "../modules/Brand/brand.route";
import { CategoryRoutes } from "../modules/Category/category.route";
import { CustomerRoutes } from "../modules/Customer/customer.route";
import { HealthRoutes } from "../modules/Health/health.route";
import { UploadRoutes } from "../modules/Upload/upload.route";

const router = Router();

router.post(
  "/register",
  validateRequest(AuthValidation.customerRegisterValidationSchema),
  AuthController.registerCustomer,
);

router.post(
  "/login",
  validateRequest(AuthValidation.loginValidationSchema),
  AuthController.login,
);

router.post(
  "/admin/login",
  validateRequest(AuthValidation.loginValidationSchema),
  AuthController.loginAdmin,
);

const moduleRoutes = [
  {
    path: "/health",
    route: HealthRoutes,
  },
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/customers",
    route: CustomerRoutes,
  },
  {
    path: "/admins",
    route: AdminRoutes,
  },
  {
    path: "/uploads",
    route: UploadRoutes,
  },
  {
    path: "/categories",
    route: CategoryRoutes,
  },
  {
    path: "/brands",
    route: BrandRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
