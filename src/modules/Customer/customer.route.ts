import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { CustomerController } from "./customer.controller";
import { CustomerValidation } from "./customer.validation";

const router = Router();

// Customer Addresses management
router.get(
  "/addresses",
  auth("CUSTOMER"),
  CustomerController.getMyAddresses,
);

router.post(
  "/addresses",
  auth("CUSTOMER"),
  validateRequest(CustomerValidation.createAddressValidationSchema),
  CustomerController.addAddress,
);

router.patch(
  "/addresses/:addressId/default",
  auth("CUSTOMER"),
  CustomerController.setDefaultAddress,
);

router.patch(
  "/addresses/:addressId",
  auth("CUSTOMER"),
  validateRequest(CustomerValidation.updateAddressValidationSchema),
  CustomerController.updateAddress,
);

router.delete(
  "/addresses/:addressId",
  auth("CUSTOMER"),
  CustomerController.deleteAddress,
);

// Admin: Customer KPI summary
router.get(
  "/admin/summary",
  auth("SUPER_ADMIN"),
  CustomerController.getCustomersSummaryAdmin,
);

// Admin: Get all customers with pagination & filters
router.get("/", auth("SUPER_ADMIN"), CustomerController.getAllCustomers);

// Admin: Update customer status (ACTIVE, INACTIVE, SUSPENDED)
router.patch(
  "/:id/status",
  auth("SUPER_ADMIN"),
  validateRequest(CustomerValidation.updateCustomerStatusValidationSchema),
  CustomerController.updateCustomerStatus,
);

// View single customer profile (Self or Super Admin)
router.get("/:id", auth(), CustomerController.getCustomerById);

// Update customer profile (Self or Super Admin)
router.patch(
  "/:id",
  auth(),
  validateRequest(CustomerValidation.updateCustomerValidationSchema),
  CustomerController.updateCustomer,
);

// Admin: Soft delete customer
router.delete("/:id", auth("SUPER_ADMIN"), CustomerController.deleteCustomer);

export const CustomerRoutes = router;
