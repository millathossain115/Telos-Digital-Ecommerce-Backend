import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { DashboardService } from "./dashboard.service";

const getDashboardKpis = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getDashboardKpis();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Dashboard KPIs retrieved successfully",
    data: result,
  });
});

const getRevenueAnalytics = catchAsync(async (req: Request, res: Response) => {
  const viewMode = (req.query.viewMode as "daily" | "monthly") || "daily";
  const result = await DashboardService.getRevenueAnalytics(viewMode);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Revenue analytics retrieved successfully",
    data: result,
  });
});

const getPaymentChannels = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getPaymentChannels(req.query as any);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment channel distribution retrieved successfully",
    data: result,
  });
});

const getStockAlerts = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getStockAlerts();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Stock alerts retrieved successfully",
    data: result,
  });
});

const getActionCenter = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getActionCenter();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Dashboard action center metrics retrieved successfully",
    data: result,
  });
});

const getTopProducts = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getTopProducts(req.query as any);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Top best-selling products retrieved successfully",
    data: result,
  });
});

const getRecentOrders = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getRecentOrders(req.query as any);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Recent filtered orders retrieved successfully",
    data: result,
  });
});

const getRecentActivities = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getRecentActivities();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Recent activity stream retrieved successfully",
    data: result,
  });
});

export const DashboardController = {
  getDashboardKpis,
  getRevenueAnalytics,
  getPaymentChannels,
  getStockAlerts,
  getActionCenter,
  getTopProducts,
  getRecentOrders,
  getRecentActivities,
};
