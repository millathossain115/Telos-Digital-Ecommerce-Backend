import { Router } from "express";
import auth, { optionalAuth } from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { OrderController } from "./order.controller";
import { OrderValidation } from "./order.validation";

const router = Router();

// ==================== CUSTOMER & CHECKOUT ROUTES ====================
// Pre-flight stock & status verification before order confirmation (Public, No Auth, ultra-fast)
router.post(
  "/validate-checkout",
  validateRequest(OrderValidation.checkCheckoutStockValidationSchema),
  OrderController.validateCheckoutStock,
);

router.post(
  "/check-stock",
  validateRequest(OrderValidation.checkCheckoutStockValidationSchema),
  OrderController.validateCheckoutStock,
);

// Create order (Customer or Guest checkout)
router.post(
  "/",
  optionalAuth(),
  validateRequest(OrderValidation.createOrderValidationSchema),
  OrderController.createOrder,
);

// Get authenticated customer's order history
router.get("/my", auth("CUSTOMER"), OrderController.getMyOrders);

// Get customer single order details
router.get("/my/:id", auth("CUSTOMER"), OrderController.getMyOrderById);

// Customer cancel order (only allowed if status is PENDING)
router.patch(
  "/my/:id/cancel",
  auth("CUSTOMER"),
  validateRequest(OrderValidation.cancelMyOrderValidationSchema),
  OrderController.cancelMyOrder,
);

// ==================== ADMIN MANAGEMENT ROUTES ====================
// Order analytics KPIs
router.get("/stats", auth("SUPER_ADMIN"), OrderController.getOrderStats);

// List all orders with filters, search, pagination
router.get("/", auth("SUPER_ADMIN"), OrderController.getAllOrders);

// Get single order by ID or orderNumber (e.g. TC-94281)
router.get("/:id", auth("SUPER_ADMIN"), OrderController.getOrderById);

// Update order fulfillment status
router.patch(
  "/:id/status",
  auth("SUPER_ADMIN"),
  validateRequest(OrderValidation.updateOrderStatusValidationSchema),
  OrderController.updateOrderStatus,
);

// Assign courier and tracking number
router.patch(
  "/:id/courier",
  auth("SUPER_ADMIN"),
  validateRequest(OrderValidation.assignCourierValidationSchema),
  OrderController.assignCourierTracking,
);

// Update order payment status / transaction details
router.patch(
  "/:id/payment",
  auth("SUPER_ADMIN"),
  validateRequest(OrderValidation.updateOrderPaymentValidationSchema),
  OrderController.updateOrderPayment,
);

export const OrderRoutes = router;
