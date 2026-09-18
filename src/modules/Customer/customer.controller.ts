import { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { CustomerService } from "./customer.service";

const getAllCustomers = catchAsync(async (req: Request, res: Response) => {
  const { searchTerm, status, startDate, endDate, page, limit, sortBy, sortOrder } =
    req.query;

  const result = await CustomerService.getAllCustomers(
    {
      searchTerm: searchTerm as string,
      status: status as any,
      startDate: startDate as string,
      endDate: endDate as string,
    },
    { page: page as string, limit: limit as string },
    { sortBy: sortBy as string, sortOrder: sortOrder as any },
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Customers retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getCustomerById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const currentUser = req.user!;

  // If customer is requesting, ensure they only access their own profile
  if (currentUser.role === "CUSTOMER" && currentUser.id !== id) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only view your own customer profile",
    );
  }

  const result = await CustomerService.getCustomerById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Customer profile retrieved successfully",
    data: result,
  });
});

const updateCustomer = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const currentUser = req.user!;

  if (currentUser.role === "CUSTOMER" && currentUser.id !== id) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only update your own customer profile",
    );
  }

  const result = await CustomerService.updateCustomer(id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Customer profile updated successfully",
    data: result,
  });
});

const deleteCustomer = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CustomerService.deleteCustomer(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Customer soft-deleted successfully",
    data: result,
  });
});

const getCustomersSummaryAdmin = catchAsync(async (_req: Request, res: Response) => {
  const result = await CustomerService.getCustomersSummaryAdmin();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Customers summary retrieved successfully",
    data: result,
  });
});

const updateCustomerStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const result = await CustomerService.updateCustomerStatus(id, status);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Customer status updated successfully",
    data: result,
  });
});

// ==================== ADDRESS HANDLERS ====================

const getMyAddresses = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const result = await CustomerService.getMyAddresses(customerId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Addresses retrieved successfully",
    data: result,
  });
});

const addAddress = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const result = await CustomerService.addAddress(customerId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Address added successfully",
    data: result,
  });
});

const updateAddress = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { addressId } = req.params;
  const result = await CustomerService.updateAddress(
    customerId,
    addressId,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Address updated successfully",
    data: result,
  });
});

const setDefaultAddress = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { addressId } = req.params;
  const result = await CustomerService.setDefaultAddress(customerId, addressId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Default address updated successfully",
    data: result,
  });
});

const deleteAddress = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { addressId } = req.params;
  const result = await CustomerService.deleteAddress(customerId, addressId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Address deleted successfully",
    data: result,
  });
});

export const CustomerController = {
  getAllCustomers,
  getCustomersSummaryAdmin,
  getCustomerById,
  updateCustomer,
  updateCustomerStatus,
  deleteCustomer,
  getMyAddresses,
  addAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
};
