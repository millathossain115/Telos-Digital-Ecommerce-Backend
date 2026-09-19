import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { ReportService } from "./report.service";

const getProfitReport = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportService.getProfitReport(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profit report generated successfully",
    meta: result.meta,
    data: {
      summary: result.summary,
      items: result.items,
    },
  });
});

const getStockReport = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportService.getStockReport(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Stock valuation report generated successfully",
    meta: result.meta,
    data: {
      summary: result.summary,
      items: result.items,
    },
  });
});

const getLowStockReport = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportService.getLowStockReport(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Low-stock replenishment report generated successfully",
    meta: result.meta,
    data: {
      summary: result.summary,
      items: result.items,
    },
  });
});

const getTransactionReport = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportService.getTransactionReport(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Transaction audit report generated successfully",
    meta: result.meta,
    data: {
      summary: result.summary,
      items: result.items,
    },
  });
});

const getSalesReport = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportService.getSalesReport(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Sales performance report generated successfully",
    meta: result.meta,
    data: {
      summary: result.summary,
      items: result.items,
    },
  });
});

export const ReportController = {
  getProfitReport,
  getStockReport,
  getLowStockReport,
  getTransactionReport,
  getSalesReport,
};
