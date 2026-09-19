import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { ActivityLogService } from "./activityLog.service";

const getActivityLogs = catchAsync(async (req: Request, res: Response) => {
  const {
    searchTerm,
    category,
    severity,
    startDate,
    endDate,
    page,
    limit,
    sortBy,
    sortOrder,
  } = req.query;

  const result = await ActivityLogService.getAllActivityLogs(
    {
      searchTerm: searchTerm as string,
      category: category as string,
      severity: severity as string,
      startDate: startDate as string,
      endDate: endDate as string,
    },
    { page: page as string, limit: limit as string },
    { sortBy: sortBy as string, sortOrder: sortOrder as string },
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Activity logs retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getActivitySummary = catchAsync(async (req: Request, res: Response) => {
  const result = await ActivityLogService.getActivitySummary();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Activity log summary metrics retrieved successfully",
    data: result,
  });
});

export const ActivityLogController = {
  getActivityLogs,
  getActivitySummary,
};
