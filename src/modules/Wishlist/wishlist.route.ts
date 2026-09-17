import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { WishlistController } from "./wishlist.controller";
import { WishlistValidation } from "./wishlist.validation";

const router = Router();

// Customer personal wishlist routes
router.get("/my", auth(), WishlistController.getMyWishlist);
router.post(
  "/",
  auth(),
  validateRequest(WishlistValidation.addToWishlistValidationSchema),
  WishlistController.addToWishlist,
);
router.delete("/clear", auth(), WishlistController.clearWishlist);
router.delete("/:id", auth(), WishlistController.removeWishlistItem);

// Admin oversight routes (manage all user wishlists)
router.get("/all", auth("SUPER_ADMIN"), WishlistController.getAllWishlists);
router.delete(
  "/admin/bulk-delete",
  auth("SUPER_ADMIN"),
  validateRequest(WishlistValidation.adminBulkDeleteWishlistValidationSchema),
  WishlistController.bulkDeleteAdminWishlistItems,
);
router.delete(
  "/admin/:id",
  auth("SUPER_ADMIN"),
  WishlistController.deleteAdminWishlistItem,
);

export const WishlistRoutes = router;
