import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.validation";

const router = Router();

// Public Customer Registration
router.post(
  "/customer/register",
  validateRequest(AuthValidation.customerRegisterValidationSchema),
  AuthController.registerCustomer,
);

// Alias: /register -> Customer Registration
router.post(
  "/register",
  validateRequest(AuthValidation.customerRegisterValidationSchema),
  AuthController.registerCustomer,
);

// Customer Login
router.post(
  "/customer/login",
  validateRequest(AuthValidation.loginValidationSchema),
  AuthController.loginCustomer,
);

// Admin Login
router.post(
  "/admin/login",
  validateRequest(AuthValidation.loginValidationSchema),
  AuthController.loginAdmin,
);

// Customer Login Alias
router.post(
  "/login",
  validateRequest(AuthValidation.loginValidationSchema),
  AuthController.login,
);

// Refresh Access Token
router.post(
  "/refresh-token",
  validateRequest(AuthValidation.refreshTokenValidationSchema),
  AuthController.refreshToken,
);

// Current Authenticated Profile
router.get("/me", auth(), AuthController.getMe);

// Change Password
router.post(
  "/change-password",
  auth(),
  validateRequest(AuthValidation.changePasswordValidationSchema),
  AuthController.changePassword,
);

// Logout (clears refresh cookie)
router.post("/logout", AuthController.logout);

export const AuthRoutes = router;
