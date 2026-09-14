import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { AdminController } from "./admin.controller";
import { AdminValidation } from "./admin.validation";

const router = Router();

// All Admin management routes are strictly protected for SUPER_ADMIN
router.post(
  "/",
  auth("SUPER_ADMIN"),
  validateRequest(AdminValidation.createAdminValidationSchema),
  AdminController.createAdmin,
);

router.get("/", auth("SUPER_ADMIN"), AdminController.getAllAdmins);

router.get("/:id", auth("SUPER_ADMIN"), AdminController.getAdminById);

router.patch(
  "/:id",
  auth("SUPER_ADMIN"),
  validateRequest(AdminValidation.updateAdminValidationSchema),
  AdminController.updateAdmin,
);

router.delete("/:id", auth("SUPER_ADMIN"), AdminController.deleteAdmin);

export const AdminRoutes = router;
