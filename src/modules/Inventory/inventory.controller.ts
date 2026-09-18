import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { InventoryService } from "./inventory.service";

const adjustStock = catchAsync(async (req: Request, res: Response) => {
  const result = await InventoryService.adjustStock(req.body, req.user as any);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Product stock adjusted and audit log recorded successfully",
    data: result,
  });
});

const getAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const {
    searchTerm,
    productId,
    actionType,
    reason,
    startDate,
    endDate,
    page,
    limit,
    sortBy,
    sortOrder,
  } = req.query;

  const result = await InventoryService.getAuditLogs(
    {
      searchTerm: searchTerm as string,
      productId: productId as string,
      actionType: actionType as any,
      reason: reason as string,
      startDate: startDate as string,
      endDate: endDate as string,
    },
    { page: page as string, limit: limit as string },
    { sortBy: sortBy as string, sortOrder: sortOrder as string },
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Inventory audit logs retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getAuditSummary = catchAsync(async (req: Request, res: Response) => {
  const result = await InventoryService.getAuditSummary();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Inventory audit summary retrieved successfully",
    data: result,
  });
});

export const InventoryController = {
  adjustStock,
  getAuditLogs,
  getAuditSummary,
};
