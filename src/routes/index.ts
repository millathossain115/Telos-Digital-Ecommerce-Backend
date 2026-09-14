import { Router } from "express";
import { AdminRoutes } from "../modules/Admin/admin.route";
import { AuthRoutes } from "../modules/Auth/auth.route";
import { CustomerRoutes } from "../modules/Customer/customer.route";
import { HealthRoutes } from "../modules/Health/health.route";

const router = Router();

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
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
