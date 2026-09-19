import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ActivityLogController } from "./activityLog.controller";
import { ActivityLogValidation } from "./activityLog.validation";

const router = Router();

// Retrieve KPI summary metrics (Critical, Security, Total counters)
router.get(
  "/summary",
  auth("SUPER_ADMIN"),
  ActivityLogController.getActivitySummary,
);

// Retrieve paginated and filtered activity stream
router.get(
  "/",
  auth("SUPER_ADMIN"),
  validateRequest(ActivityLogValidation.getActivityLogsValidationSchema),
  ActivityLogController.getActivityLogs,
);

export const ActivityLogRoutes = router;
