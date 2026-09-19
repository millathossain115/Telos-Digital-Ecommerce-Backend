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
import { CartRoutes } from "../modules/Cart/cart.route";
import { ProductRoutes } from "../modules/Product/product.route";
import { UploadRoutes } from "../modules/Upload/upload.route";
import { WishlistRoutes } from "../modules/Wishlist/wishlist.route";
import { ReviewRoutes } from "../modules/Review/review.route";
import { InventoryRoutes } from "../modules/Inventory/inventory.route";
import { OrderRoutes } from "../modules/Order/order.route";
import { ReportRoutes } from "../modules/Report/report.route";
import { PaymentRoutes } from "../modules/Payment/payment.route";
import { ActivityLogRoutes } from "../modules/ActivityLog/activityLog.route";
import { DashboardRoutes } from "../modules/Dashboard/dashboard.route";

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
  {
    path: "/products",
    route: ProductRoutes,
  },
  {
    path: "/cart",
    route: CartRoutes,
  },
  {
    path: "/wishlist",
    route: WishlistRoutes,
  },
  {
    path: "/reviews",
    route: ReviewRoutes,
  },
  {
    path: "/inventory",
    route: InventoryRoutes,
  },
  {
    path: "/orders",
    route: OrderRoutes,
  },
  {
    path: "/reports",
    route: ReportRoutes,
  },
  {
    path: "/payments",
    route: PaymentRoutes,
  },
  {
    path: "/activity-logs",
    route: ActivityLogRoutes,
  },
  {
    path: "/dashboard",
    route: DashboardRoutes,
  },
];


moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
