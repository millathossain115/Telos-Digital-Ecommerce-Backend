import bcryptjs from "bcryptjs";
import httpStatus from "http-status";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import config from "../../config";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
import { TRole } from "../../interface";
import {
  TAuthProfileResponse,
  TAuthResponse,
  TChangePasswordPayload,
  TCustomerRegisterPayload,
  TLoginPayload,
  TRefreshTokenResponse,
} from "./auth.interface";

// Helper to generate unique Customer ID (e.g. TC-2026-1042)
const generateCustomerId = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  let isUnique = false;
  let customerId = "";
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    attempts++;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    customerId = `TC-${currentYear}-${randomSuffix}`;
    const existing = await prisma.customer.findUnique({
      where: { customerId },
      select: { id: true },
    });
    if (!existing) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    customerId = `TC-${currentYear}-${Date.now().toString().slice(-4)}`;
  }

  return customerId;
};

// Helper to generate Access Token
const generateAccessToken = (payload: {
  id: string;
  email: string;
  role: TRole;
}): string => {
  const accessSignOptions: SignOptions = {
    expiresIn: config.jwt.access_expires_in as SignOptions["expiresIn"],
  };
  return jwt.sign(
    payload,
    config.jwt.access_secret as string,
    accessSignOptions,
  );
};

// Helper to generate both Access and Refresh tokens
const generateTokens = (payload: {
  id: string;
  email: string;
  role: TRole;
}) => {
  const accessToken = generateAccessToken(payload);
  const refreshSignOptions: SignOptions = {
    expiresIn: config.jwt.refresh_expires_in as SignOptions["expiresIn"],
  };

  const refreshToken = jwt.sign(
    { id: payload.id, email: payload.email, role: payload.role },
    config.jwt.refresh_secret as string,
    refreshSignOptions,
  );

  return { accessToken, refreshToken };
};

const getLoginIdentifier = (payload: TLoginPayload): string =>
  (
    payload.email ||
    payload.phone ||
    payload.mobile ||
    payload.identifier ||
    ""
  ).trim();

const registerCustomer = async (
  payload: TCustomerRegisterPayload,
): Promise<TAuthResponse> => {
  const normalizedEmail = payload.email.toLowerCase().trim();
  const normalizedPhone = payload.phone.trim();
  const name = (payload.name || payload.fullName || "").trim();

  // Ensure unique email across customers and admins, and unique phone for customers.
  const [existingCustomerByEmail, existingAdmin, existingCustomerByPhone] =
    await Promise.all([
      prisma.customer.findUnique({ where: { email: normalizedEmail } }),
      prisma.admin.findUnique({ where: { email: normalizedEmail } }),
      prisma.customer.findUnique({ where: { phone: normalizedPhone } }),
    ]);

  if (existingCustomerByEmail || existingAdmin) {
    throw new AppError(
      httpStatus.CONFLICT,
      "An account with this email address already exists",
    );
  }

  if (existingCustomerByPhone) {
    throw new AppError(
      httpStatus.CONFLICT,
      "An account with this phone number already exists",
    );
  }

  // Hash password
  const hashedPassword = await bcryptjs.hash(
    payload.password,
    config.bcrypt_salt_rounds,
  );

  // Generate unique business customerId
  const customerId = await generateCustomerId();

  const customer = await prisma.customer.create({
    data: {
      customerId,
      name,
      email: normalizedEmail,
      password: hashedPassword,
      phone: normalizedPhone,
      status: "ACTIVE",
      isDeleted: false,
    },
    select: {
      id: true,
      customerId: true,
      name: true,
      email: true,
      phone: true,
      avatar: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const { accessToken, refreshToken } = generateTokens({
    id: customer.id,
    email: customer.email,
    role: "CUSTOMER",
  });

  return {
    accessToken,
    refreshToken,
    user: {
      ...customer,
      role: "CUSTOMER",
    },
  };
};

const loginCustomer = async (
  payload: TLoginPayload,
): Promise<TAuthResponse> => {
  const identifier = getLoginIdentifier(payload);
  const normalizedIdentifier = identifier.toLowerCase();
  const isEmailLogin = identifier.includes("@");

  const customer = isEmailLogin
    ? await prisma.customer.findUnique({
        where: { email: normalizedIdentifier },
      })
    : await prisma.customer.findUnique({
        where: { phone: identifier },
      });

  if (!customer || customer.isDeleted) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Invalid email/phone or password",
    );
  }

  if (customer.status !== "ACTIVE") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Your account is ${customer.status.toLowerCase()}. Please contact TelosCart support.`,
    );
  }

  const isPasswordMatched = await bcryptjs.compare(
    payload.password,
    customer.password,
  );

  if (!isPasswordMatched) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Invalid email/phone or password",
    );
  }

  const { accessToken, refreshToken } = generateTokens({
    id: customer.id,
    email: customer.email,
    role: "CUSTOMER",
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: customer.id,
      customerId: customer.customerId,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      avatar: customer.avatar,
      role: "CUSTOMER",
      status: customer.status,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    },
  };
};

const loginAdmin = async (payload: TLoginPayload): Promise<TAuthResponse> => {
  const identifier = getLoginIdentifier(payload);
  const normalizedEmail = identifier.toLowerCase();

  const admin = await prisma.admin.findUnique({
    where: { email: normalizedEmail },
  });

  if (!admin || admin.isDeleted) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  if (admin.status !== "ACTIVE") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Your admin account is ${admin.status.toLowerCase()}. Contact system administrator.`,
    );
  }

  const isPasswordMatched = await bcryptjs.compare(
    payload.password,
    admin.password,
  );

  if (!isPasswordMatched) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  const { accessToken, refreshToken } = generateTokens({
    id: admin.id,
    email: admin.email,
    role: "SUPER_ADMIN",
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      avatar: admin.avatar,
      role: "SUPER_ADMIN",
      status: admin.status,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    },
  };
};

// Public site login is customer-only. Admins must use /admin/login.
const login = async (payload: TLoginPayload): Promise<TAuthResponse> => {
  return loginCustomer(payload);
};

const refreshToken = async (token: string): Promise<TRefreshTokenResponse> => {
  if (!token) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Refresh token is required");
  }

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(
      token,
      config.jwt.refresh_secret as string,
    ) as JwtPayload;
  } catch (error) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Invalid or expired refresh token",
    );
  }

  const { id, role } = decoded as { id: string; role: TRole };

  if (role === "SUPER_ADMIN") {
    const admin = await prisma.admin.findUnique({
      where: { id },
      select: { id: true, email: true, status: true, isDeleted: true },
    });

    if (!admin || admin.isDeleted || admin.status !== "ACTIVE") {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "Admin account not found or deactivated",
      );
    }

    const newAccessToken = generateAccessToken({
      id: admin.id,
      email: admin.email,
      role: "SUPER_ADMIN",
    });

    return { accessToken: newAccessToken };
  } else if (role === "CUSTOMER") {
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true, email: true, status: true, isDeleted: true },
    });

    if (!customer || customer.isDeleted || customer.status !== "ACTIVE") {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "Customer account not found or deactivated",
      );
    }

    const newAccessToken = generateAccessToken({
      id: customer.id,
      email: customer.email,
      role: "CUSTOMER",
    });

    return { accessToken: newAccessToken };
  } else {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid role token");
  }
};

const getMe = async (
  userId: string,
  role: TRole,
): Promise<TAuthProfileResponse> => {
  if (role === "SUPER_ADMIN") {
    const admin = await prisma.admin.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        status: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!admin || admin.isDeleted) {
      throw new AppError(httpStatus.NOT_FOUND, "Admin profile not found");
    }

    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      avatar: admin.avatar,
      role: "SUPER_ADMIN",
      status: admin.status,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };
  }

  const customer = await prisma.customer.findUnique({
    where: { id: userId },
    select: {
      id: true,
      customerId: true,
      name: true,
      email: true,
      phone: true,
      avatar: true,
      status: true,
      isDeleted: true,
      createdAt: true,
      updatedAt: true,
      addresses: {
        select: {
          id: true,
          title: true,
          type: true,
          isDefault: true,
          street: true,
          city: true,
          state: true,
          postalCode: true,
          country: true,
        },
      },
    },
  });

  if (!customer || customer.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Customer profile not found");
  }

  return {
    id: customer.id,
    customerId: customer.customerId,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    avatar: customer.avatar,
    role: "CUSTOMER",
    status: customer.status,
    addresses: customer.addresses,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
};

const changePassword = async (
  userId: string,
  role: TRole,
  payload: TChangePasswordPayload,
) => {
  if (role === "SUPER_ADMIN") {
    const admin = await prisma.admin.findUnique({
      where: { id: userId },
    });

    if (!admin || admin.isDeleted) {
      throw new AppError(httpStatus.NOT_FOUND, "Admin not found");
    }

    const isMatch = await bcryptjs.compare(payload.oldPassword, admin.password);
    if (!isMatch) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Current password does not match",
      );
    }

    const newHash = await bcryptjs.hash(
      payload.newPassword,
      config.bcrypt_salt_rounds,
    );
    await prisma.admin.update({
      where: { id: userId },
      data: { password: newHash },
    });

    return { message: "Password updated successfully" };
  }

  const customer = await prisma.customer.findUnique({
    where: { id: userId },
  });

  if (!customer || customer.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Customer not found");
  }

  const isMatch = await bcryptjs.compare(
    payload.oldPassword,
    customer.password,
  );
  if (!isMatch) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Current password does not match",
    );
  }

  const newHash = await bcryptjs.hash(
    payload.newPassword,
    config.bcrypt_salt_rounds,
  );
  await prisma.customer.update({
    where: { id: userId },
    data: { password: newHash },
  });

  return { message: "Password updated successfully" };
};

export const AuthService = {
  registerCustomer,
  loginCustomer,
  loginAdmin,
  login,
  refreshToken,
  getMe,
  changePassword,
};
