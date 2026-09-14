import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";

const checkHealth = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "TelosCart API Server is operational",
    data: {
      status: "healthy",
      service: "TelosCart E-Commerce Backend",
      portal: "https://www.teloscart.website/",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

export const HealthController = {
  checkHealth,
};
