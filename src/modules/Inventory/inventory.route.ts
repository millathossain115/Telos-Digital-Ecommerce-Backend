import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { InventoryController } from "./inventory.controller";
import { InventoryValidation } from "./inventory.validation";

const router = Router();

// Adjust stock (+ / -) with reason and create audit trail entry
router.post(
  "/adjust",
  auth("SUPER_ADMIN"),
  validateRequest(InventoryValidation.adjustStockValidationSchema),
  InventoryController.adjustStock,
);

// View paginated, searchable, filterable stock audit logs (Super Admin)
router.get("/audit-logs", auth("SUPER_ADMIN"), InventoryController.getAuditLogs);

// View audit KPIs summary (total logs, units added, units removed, net change)
router.get(
  "/audit-summary",
  auth("SUPER_ADMIN"),
  InventoryController.getAuditSummary,
);

export const InventoryRoutes = router;
