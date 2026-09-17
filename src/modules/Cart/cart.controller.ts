import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { CartService } from "./cart.service";

const getMyCart = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const result = await CartService.getMyCart(customerId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Cart retrieved successfully",
    data: result,
  });
});

const addToCart = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const result = await CartService.addToCart(customerId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Item added to cart successfully",
    data: result,
  });
});

const updateCartItem = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { id } = req.params;
  const result = await CartService.updateCartItem(customerId, id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Cart item updated successfully",
    data: result,
  });
});

const removeCartItem = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { id } = req.params;
  const result = await CartService.removeCartItem(customerId, id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Cart item removed successfully",
    data: result,
  });
});

const clearCart = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const result = await CartService.clearCart(customerId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Cart cleared successfully",
    data: result,
  });
});

const getAllCarts = catchAsync(async (req: Request, res: Response) => {
  const { searchTerm, customerId, productId, page, limit } = req.query;

  const result = await CartService.getAllCarts(
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
    message: "All customer carts retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const deleteAdminCartItem = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CartService.deleteAdminCartItem(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Cart item deleted successfully by administrator",
    data: result,
  });
});

const bulkDeleteAdminCartItems = catchAsync(async (req: Request, res: Response) => {
  const { ids } = req.body;
  const result = await CartService.bulkDeleteAdminCartItems(ids);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Successfully deleted ${result.deletedCount} cart items`,
    data: result,
  });
});

export const CartController = {
  getMyCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  getAllCarts,
  deleteAdminCartItem,
  bulkDeleteAdminCartItems,
};
