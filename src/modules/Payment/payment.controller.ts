import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { PaymentService } from "./payment.service";

const getAllTransactions = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.getAllTransactions(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment transactions retrieved successfully",
    meta: result.meta,
    data: {
      stats: result.stats,
      transactions: result.transactions,
    },
  });
});

const verifyTransaction = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await PaymentService.verifyTransaction(id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Payment transaction ${req.body.status} successfully`,
    data: result,
  });
});

export const PaymentController = {
  getAllTransactions,
  verifyTransaction,
};
