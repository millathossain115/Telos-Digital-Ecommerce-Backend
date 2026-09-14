import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { AdminService } from "./admin.service";

const createAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.createAdmin(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Admin created successfully",
    data: result,
  });
});

const getAllAdmins = catchAsync(async (req: Request, res: Response) => {
  const { searchTerm, status, startDate, endDate, page, limit, sortBy, sortOrder } =
    req.query;

  const result = await AdminService.getAllAdmins(
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
    message: "Admins retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getAdminById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AdminService.getAdminById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin retrieved successfully",
    data: result,
  });
});

const updateAdmin = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AdminService.updateAdmin(id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin updated successfully",
    data: result,
  });
});

const deleteAdmin = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const currentAdminId = req.user?.id;
  const result = await AdminService.deleteAdmin(id, currentAdminId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin deleted successfully",
    data: result,
  });
});

export const AdminController = {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
};
