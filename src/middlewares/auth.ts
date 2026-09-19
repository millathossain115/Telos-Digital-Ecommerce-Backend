import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import jwt, { JwtPayload } from "jsonwebtoken";
import config from "../config";
import AppError from "../errors/AppError";
import { TAuthUser, TRole } from "../interface";
import prisma from "../lib/prisma";
import catchAsync from "../shared/catchAsync";

/**
 * Authentication & Role Authorization Middleware
 *
 * @param requiredRoles - Array of allowed roles (e.g. 'SUPER_ADMIN', 'CUSTOMER').
 *                        If omitted, any valid authenticated user is permitted.
 */
const auth = (...requiredRoles: TRole[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "Authentication token required",
      );
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    if (!token) {
      throw new AppError(httpStatus.UNAUTHORIZED, "Invalid token format");
    }

    // Verify JWT token
    const decoded = jwt.verify(
      token,
      config.jwt.access_secret as string,
    ) as JwtPayload & TAuthUser;

    const { id, role } = decoded;

    // Verify user exists and is active based on role
    if (role === "SUPER_ADMIN") {
      const admin = await prisma.admin.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          status: true,
          isDeleted: true,
        },
      });

      if (!admin || admin.isDeleted) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          "Admin account not found or deactivated",
        );
      }

      if (admin.status !== "ACTIVE") {
        throw new AppError(
          httpStatus.FORBIDDEN,
          `Your admin account is ${admin.status.toLowerCase()}. Please contact system owner.`,
        );
      }

      req.user = {
        id: admin.id,
        email: admin.email,
        role: "SUPER_ADMIN",
      };
    } else if (role === "CUSTOMER") {
      const customer = await prisma.customer.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          status: true,
          isDeleted: true,
        },
      });

      if (!customer || customer.isDeleted) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          "Customer account not found or deactivated",
        );
      }

      if (customer.status !== "ACTIVE") {
        throw new AppError(
          httpStatus.FORBIDDEN,
          `Your account is ${customer.status.toLowerCase()}. Please contact TelosCart support.`,
        );
      }

      req.user = {
        id: customer.id,
        email: customer.email,
        role: "CUSTOMER",
      };
    } else {
      throw new AppError(httpStatus.UNAUTHORIZED, "Invalid user role in token");
    }

    // Role verification (e.g. check if endpoint requires SUPER_ADMIN)
    if (requiredRoles.length > 0 && !requiredRoles.includes(role)) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Forbidden: Access denied. Super Admin access required.",
      );
    }

    next();
  });
};

export const optionalAuth = () => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return next();
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(
        token,
        config.jwt.access_secret as string,
      ) as JwtPayload & TAuthUser;

      const { id, role } = decoded;

      if (role === "CUSTOMER") {
        const customer = await prisma.customer.findUnique({
          where: { id },
          select: { id: true, email: true, status: true, isDeleted: true },
        });

        if (customer && !customer.isDeleted && customer.status === "ACTIVE") {
          req.user = {
            id: customer.id,
            email: customer.email,
            role: "CUSTOMER",
          };
        }
      } else if (role === "SUPER_ADMIN") {
        const admin = await prisma.admin.findUnique({
          where: { id },
          select: { id: true, email: true, status: true, isDeleted: true },
        });

        if (admin && !admin.isDeleted && admin.status === "ACTIVE") {
          req.user = {
            id: admin.id,
            email: admin.email,
            role: "SUPER_ADMIN",
          };
        }
      }
    } catch {
      // If invalid/expired token, proceed as guest without failing
    }

    next();
  });
};

export default auth;
