import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ReportController } from "./report.controller";
import { ReportValidation } from "./report.validation";

const router = Router();

// All report endpoints are exclusively protected for Super Admin
// And use POST requests to safely pass complex filter and pagination payloads

router.post(
  "/profit",
  auth("SUPER_ADMIN"),
  validateRequest(ReportValidation.profitReportSchema),
  ReportController.getProfitReport,
);

router.post(
  "/stock",
  auth("SUPER_ADMIN"),
  validateRequest(ReportValidation.stockReportSchema),
  ReportController.getStockReport,
);

router.post(
  "/low-stock",
  auth("SUPER_ADMIN"),
  validateRequest(ReportValidation.lowStockReportSchema),
  ReportController.getLowStockReport,
);

router.post(
  "/transactions",
  auth("SUPER_ADMIN"),
  validateRequest(ReportValidation.transactionReportSchema),
  ReportController.getTransactionReport,
);

router.post(
  "/sales",
  auth("SUPER_ADMIN"),
  validateRequest(ReportValidation.salesReportSchema),
  ReportController.getSalesReport,
);

export const ReportRoutes = router;
