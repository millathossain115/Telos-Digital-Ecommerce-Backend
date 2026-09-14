import { Prisma } from "@prisma/client";
import bcryptjs from "bcryptjs";
import httpStatus from "http-status";
import config from "../../config";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
import {
  buildDateRangeFilter,
  buildSearchFilter,
  buildSortOrder,
  ISortOptions,
} from "../../shared/filterHelper";
import {
  buildPaginationMeta,
  calculatePagination,
  IPaginationOptions,
} from "../../shared/paginationHelper";
import { adminSearchableFields, adminSortableFields } from "./admin.constant";
import {
  TAdminFilterRequest,
  TCreateAdminPayload,
  TUpdateAdminPayload,
} from "./admin.interface";

const safeAdminSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatar: true,
  role: true,
  status: true,
  isDeleted: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
};

const createAdmin = async (payload: TCreateAdminPayload) => {
  const normalizedEmail = payload.email.toLowerCase().trim();

  const [existingAdmin, existingCustomer] = await Promise.all([
    prisma.admin.findUnique({ where: { email: normalizedEmail } }),
    prisma.customer.findUnique({ where: { email: normalizedEmail } }),
  ]);

  if (existingAdmin || existingCustomer) {
    throw new AppError(
      httpStatus.CONFLICT,
      "An account with this email already exists",
    );
  }

  const hashedPassword = await bcryptjs.hash(
    payload.password,
    config.bcrypt_salt_rounds,
  );

  const admin = await prisma.admin.create({
    data: {
      name: payload.name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: payload.phone?.trim() || null,
      avatar: payload.avatar || null,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      isDeleted: false,
    },
    select: safeAdminSelect,
  });

  return admin;
};

const getAllAdmins = async (
  filters: TAdminFilterRequest,
  paginationOptions?: IPaginationOptions,
  sortOptions?: ISortOptions,
) => {
  const { page, limit, skip } = calculatePagination(paginationOptions);
  const orderBy = buildSortOrder(sortOptions, adminSortableFields);

  const andConditions: Prisma.AdminWhereInput[] = [{ isDeleted: false }];

  if (filters.searchTerm) {
    const searchFilter = buildSearchFilter(
      filters.searchTerm,
      adminSearchableFields,
    );
    if (searchFilter) {
      andConditions.push(searchFilter);
    }
  }

  if (filters.status) {
    andConditions.push({ status: filters.status });
  }

  if (filters.startDate || filters.endDate) {
    const dateFilter = buildDateRangeFilter(
      "createdAt",
      filters.startDate,
      filters.endDate,
    );
    if (dateFilter) {
      andConditions.push(dateFilter);
    }
  }

  const whereConditions: Prisma.AdminWhereInput = { AND: andConditions };

  const [admins, total] = await Promise.all([
    prisma.admin.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      select: safeAdminSelect,
    }),
    prisma.admin.count({ where: whereConditions }),
  ]);

  return {
    meta: buildPaginationMeta(page, limit, total),
    data: admins,
  };
};

const getAdminById = async (id: string) => {
  const admin = await prisma.admin.findFirst({
    where: { id, isDeleted: false },
    select: safeAdminSelect,
  });

  if (!admin) {
    throw new AppError(httpStatus.NOT_FOUND, "Admin not found");
  }

  return admin;
};

const updateAdmin = async (id: string, payload: TUpdateAdminPayload) => {
  await getAdminById(id);

  const { password, ...rest } = payload;
  const updateData: Prisma.AdminUpdateInput = { ...rest };

  if (password) {
    updateData.password = await bcryptjs.hash(
      password,
      config.bcrypt_salt_rounds,
    );
  }

  const result = await prisma.admin.update({
    where: { id },
    data: updateData,
    select: safeAdminSelect,
  });

  return result;
};

const deleteAdmin = async (id: string, currentAdminId?: string) => {
  if (currentAdminId && id === currentAdminId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You cannot delete your own admin account",
    );
  }

  await getAdminById(id);

  const result = await prisma.admin.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      status: "INACTIVE",
    },
    select: safeAdminSelect,
  });

  return result;
};

export const AdminService = {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
};
