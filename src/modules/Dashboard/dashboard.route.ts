import { Router } from "express";
import auth from "../../middlewares/auth";
import { DashboardController } from "./dashboard.controller";

const router = Router();

// Modular independent endpoints for each dashboard card / widget
// Strictly isolated so a slowdown or failure on one card will never block others
router.get("/kpis", auth("SUPER_ADMIN"), DashboardController.getDashboardKpis);
router.get(
  "/revenue-analytics",
  auth("SUPER_ADMIN"),
  DashboardController.getRevenueAnalytics,
);
router.get(
  "/payment-channels",
  auth("SUPER_ADMIN"),
  DashboardController.getPaymentChannels,
);
router.get(
  "/stock-alerts",
  auth("SUPER_ADMIN"),
  DashboardController.getStockAlerts,
);
router.get(
  "/action-center",
  auth("SUPER_ADMIN"),
  DashboardController.getActionCenter,
);
router.get(
  "/top-products",
  auth("SUPER_ADMIN"),
  DashboardController.getTopProducts,
);
router.get(
  "/recent-orders",
  auth("SUPER_ADMIN"),
  DashboardController.getRecentOrders,
);
router.get(
  "/recent-activities",
  auth("SUPER_ADMIN"),
  DashboardController.getRecentActivities,
);

export const DashboardRoutes = router;
