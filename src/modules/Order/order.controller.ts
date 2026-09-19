import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { OrderService } from "./order.service";

// ==================== CUSTOMER CONTROLLERS ====================
const createOrder = catchAsync(async (req, res) => {
  const result = await OrderService.createOrder(req.body, req.user);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: `Order #${result.orderNumber} placed successfully`,
    data: result,
  });
});

const getMyOrders = catchAsync(async (req, res) => {
  const customerId = req.user!.id;
  const { status, page, limit } = req.query;

  const result = await OrderService.getMyOrders(
    customerId,
    { status: status as any },
    { page: Number(page) || 1, limit: Number(limit) || 10 },
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Customer orders retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getMyOrderById = catchAsync(async (req, res) => {
  const customerId = req.user!.id;
  const result = await OrderService.getMyOrderById(customerId, req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Order details retrieved successfully",
    data: result,
  });
});

const cancelMyOrder = catchAsync(async (req, res) => {
  const customerId = req.user!.id;
  const result = await OrderService.cancelMyOrder(
    customerId,
    req.params.id,
    req.body.reason,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Order #${result.orderNumber} cancelled successfully`,
    data: result,
  });
});

// ==================== ADMIN CONTROLLERS ====================
const getAllOrders = catchAsync(async (req, res) => {
  const {
    searchTerm,
    status,
    paymentStatus,
    customerId,
    startDate,
    endDate,
    page,
    limit,
    sortBy,
    sortOrder,
  } = req.query;

  const filters = {
    searchTerm: searchTerm as string,
    status: status as any,
    paymentStatus: paymentStatus as any,
    customerId: customerId as string,
    startDate: startDate as string,
    endDate: endDate as string,
  };

  const paginationOptions = {
    page: Number(page) || 1,
    limit: Number(limit) || 20,
  };

  const sortOptions = {
    sortBy: sortBy as string,
    sortOrder: sortOrder as "asc" | "desc",
  };

  const result = await OrderService.getAllOrders(
    filters,
    paginationOptions,
    sortOptions,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Orders retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getOrderById = catchAsync(async (req, res) => {
  const result = await OrderService.getOrderById(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Order retrieved successfully",
    data: result,
  });
});

const updateOrderStatus = catchAsync(async (req, res) => {
  const result = await OrderService.updateOrderStatus(
    req.params.id,
    req.body,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Order #${result.orderNumber} status updated to ${result.status}`,
    data: result,
  });
});

const assignCourierTracking = catchAsync(async (req, res) => {
  const result = await OrderService.assignCourierTracking(
    req.params.id,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Courier assigned and tracking updated for order #${result.orderNumber}`,
    data: result,
  });
});

const updateOrderPayment = catchAsync(async (req, res) => {
  const result = await OrderService.updateOrderPayment(req.params.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Payment updated for order #${result.orderNumber}`,
    data: result,
  });
});

const getOrderStats = catchAsync(async (_req, res) => {
  const result = await OrderService.getOrderStats();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Order analytics summary retrieved successfully",
    data: result,
  });
});

const validateCheckoutStock = catchAsync(async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : req.body?.items || [];
  const result = await OrderService.validateCheckoutStock(items);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.allValid
      ? "All cart items are valid and in stock"
      : "Some cart items are out of stock or unavailable",
    data: result,
  });
});

export const OrderController = {
  createOrder,
  validateCheckoutStock,
  getMyOrders,
  getMyOrderById,
  cancelMyOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  assignCourierTracking,
  updateOrderPayment,
  getOrderStats,
};

