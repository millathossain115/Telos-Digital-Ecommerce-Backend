import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { CartController } from "./cart.controller";
import { CartValidation } from "./cart.validation";

const router = Router();

// Customer personal cart routes
router.get("/my", auth(), CartController.getMyCart);
router.post(
  "/",
  auth(),
  validateRequest(CartValidation.addToCartValidationSchema),
  CartController.addToCart,
);
router.delete("/clear", auth(), CartController.clearCart);
router.patch(
  "/:id",
  auth(),
  validateRequest(CartValidation.updateCartItemValidationSchema),
  CartController.updateCartItem,
);
router.delete("/:id", auth(), CartController.removeCartItem);

// Admin oversight routes (manage all user carts)
router.get("/all", auth("SUPER_ADMIN"), CartController.getAllCarts);
router.delete(
  "/admin/bulk-delete",
  auth("SUPER_ADMIN"),
  validateRequest(CartValidation.adminBulkDeleteCartValidationSchema),
  CartController.bulkDeleteAdminCartItems,
);
router.delete("/admin/:id", auth("SUPER_ADMIN"), CartController.deleteAdminCartItem);

export const CartRoutes = router;
