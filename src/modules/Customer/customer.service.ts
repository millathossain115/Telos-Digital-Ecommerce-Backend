import { Prisma } from "@prisma/client";
import httpStatus from "http-status";
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
import {
  customerSearchableFields,
  customerSortableFields,
} from "./customer.constant";
import {
  TCreateAddressPayload,
  TCustomerFilterRequest,
  TUpdateAddressPayload,
  TUpdateCustomerPayload,
} from "./customer.interface";

// Safe projection for customer data (excluding password)
const safeCustomerSelect = {
  id: true,
  customerId: true,
  name: true,
  email: true,
  phone: true,
  avatar: true,
  status: true,
  isDeleted: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
};

const getAllCustomers = async (
  filters: TCustomerFilterRequest,
  paginationOptions?: IPaginationOptions,
  sortOptions?: ISortOptions,
) => {
  const { page, limit, skip } = calculatePagination(paginationOptions);
  const orderBy = buildSortOrder(sortOptions, customerSortableFields);

  const andConditions: Prisma.CustomerWhereInput[] = [{ isDeleted: false }];

  // Search filter
  if (filters.searchTerm) {
    const searchFilter = buildSearchFilter(
      filters.searchTerm,
      customerSearchableFields,
    );
    if (searchFilter) {
      andConditions.push(searchFilter);
    }
  }

  // Exact status filter
  if (filters.status) {
    andConditions.push({ status: filters.status });
  }

  // Date range filter
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

  const whereConditions: Prisma.CustomerWhereInput = { AND: andConditions };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      select: {
        ...safeCustomerSelect,
        addresses: {
          select: {
            id: true,
            title: true,
            type: true,
            isDefault: true,
            city: true,
            street: true,
            country: true,
          },
        },
      },
    }),
    prisma.customer.count({ where: whereConditions }),
  ]);

  return {
    meta: buildPaginationMeta(page, limit, total),
    data: customers,
  };
};

const getCustomerById = async (idOrCustomerId: string) => {
  const customer = await prisma.customer.findFirst({
    where: {
      OR: [{ id: idOrCustomerId }, { customerId: idOrCustomerId }],
      isDeleted: false,
    },
    select: {
      ...safeCustomerSelect,
      addresses: true,
    },
  });

  if (!customer) {
    throw new AppError(httpStatus.NOT_FOUND, "Customer not found");
  }

  return customer;
};

const updateCustomer = async (
  idOrCustomerId: string,
  payload: TUpdateCustomerPayload,
) => {
  const customer = await getCustomerById(idOrCustomerId);

  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: payload,
    select: {
      ...safeCustomerSelect,
      addresses: true,
    },
  });

  return updated;
};

const deleteCustomer = async (idOrCustomerId: string) => {
  const customer = await getCustomerById(idOrCustomerId);

  const result = await prisma.customer.update({
    where: { id: customer.id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      status: "INACTIVE",
    },
    select: safeCustomerSelect,
  });

  return result;
};

// ==================== CUSTOMER ADDRESSES ====================

const addAddress = async (
  customerId: string,
  payload: TCreateAddressPayload,
) => {
  // Check customer exists
  await getCustomerById(customerId);

  // If new address is default, reset other addresses for this customer
  if (payload.isDefault) {
    await prisma.customerAddress.updateMany({
      where: { customerId },
      data: { isDefault: false },
    });
  }

  const address = await prisma.customerAddress.create({
    data: {
      ...payload,
      customerId,
    },
  });

  return address;
};

const updateAddress = async (
  customerId: string,
  addressId: string,
  payload: TUpdateAddressPayload,
) => {
  const existing = await prisma.customerAddress.findFirst({
    where: { id: addressId, customerId },
  });

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Address not found");
  }

  if (payload.isDefault) {
    await prisma.customerAddress.updateMany({
      where: { customerId },
      data: { isDefault: false },
    });
  }

  const updated = await prisma.customerAddress.update({
    where: { id: addressId },
    data: payload,
  });

  return updated;
};

const deleteAddress = async (customerId: string, addressId: string) => {
  const existing = await prisma.customerAddress.findFirst({
    where: { id: addressId, customerId },
  });

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Address not found");
  }

  await prisma.customerAddress.delete({
    where: { id: addressId },
  });

  return { message: "Address deleted successfully" };
};

export const CustomerService = {
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  addAddress,
  updateAddress,
  deleteAddress,
};
