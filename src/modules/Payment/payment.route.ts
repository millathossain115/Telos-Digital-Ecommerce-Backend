import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { PaymentController } from "./payment.controller";
import { PaymentValidation } from "./payment.validation";

const router = Router();

// Back-office transaction verification & payment ledger
router.get(
  "/",
  auth("SUPER_ADMIN"),
  PaymentController.getAllTransactions,
);

router.patch(
  "/:id/verify",
  auth("SUPER_ADMIN"),
  validateRequest(PaymentValidation.verifyPaymentValidationSchema),
  PaymentController.verifyTransaction,
);

export const PaymentRoutes = router;
