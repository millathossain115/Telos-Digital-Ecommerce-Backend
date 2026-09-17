import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { WishlistService } from "./wishlist.service";

const getMyWishlist = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const result = await WishlistService.getMyWishlist(customerId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Wishlist retrieved successfully",
    data: result,
  });
});

const addToWishlist = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const result = await WishlistService.addToWishlist(customerId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Item added to wishlist successfully",
    data: result,
  });
});

const removeWishlistItem = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { id } = req.params;
  const result = await WishlistService.removeWishlistItem(customerId, id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Item removed from wishlist successfully",
    data: result,
  });
});

const clearWishlist = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const result = await WishlistService.clearWishlist(customerId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Wishlist cleared successfully",
    data: result,
  });
});

const getAllWishlists = catchAsync(async (req: Request, res: Response) => {
  const { searchTerm, customerId, productId, page, limit } = req.query;

  const result = await WishlistService.getAllWishlists(
    {
      searchTerm: searchTerm as string,
      customerId: customerId as string,
      productId: productId as string,
    },
    {
      page: page as string,
      limit: limit as string,
    },
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All customer wishlists retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const deleteAdminWishlistItem = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await WishlistService.deleteAdminWishlistItem(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Wishlist item deleted successfully by administrator",
    data: result,
  });
});

const bulkDeleteAdminWishlistItems = catchAsync(async (req: Request, res: Response) => {
  const { ids } = req.body;
  const result = await WishlistService.bulkDeleteAdminWishlistItems(ids);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Successfully deleted ${result.deletedCount} wishlist items`,
    data: result,
  });
});

export const WishlistController = {
  getMyWishlist,
  addToWishlist,
  removeWishlistItem,
  clearWishlist,
  getAllWishlists,
  deleteAdminWishlistItem,
  bulkDeleteAdminWishlistItems,
};
