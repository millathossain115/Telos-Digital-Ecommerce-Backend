import { Prisma, UserStatus } from "@prisma/client";
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

const customerAddressSelect = {
  id: true,
  title: true,
  type: true,
  isDefault: true,
  street: true,
  city: true,
  area: true,
  union: true,
  zone: true,
  state: true,
  postalCode: true,
  country: true,
};

const searchCustomersForAdmin = async (searchTerm: string) => {
  const term = searchTerm.trim();
  if (!term) return [];

  return prisma.customer.findMany({
    where: {
      isDeleted: false,
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { phone: { contains: term, mode: "insensitive" } },
        { customerId: { contains: term, mode: "insensitive" } },
      ],
    },
    select: {
      ...safeCustomerSelect,
      addresses: { select: customerAddressSelect, orderBy: { isDefault: "desc" }, take: 3 },
      _count: { select: { orders: true } },
    },
    take: 10,
    orderBy: { createdAt: "desc" },
  });
};

const getAllCustomers = async (
  filters: TCustomerFilterRequest,
  paginationOptions?: IPaginationOptions,
  sortOptions?: ISortOptions,
) => {
  const { page, limit, skip } = calculatePagination(paginationOptions);
  const orderBy = buildSortOrder(sortOptions, customerSortableFields);

  const andConditions: Prisma.CustomerWhereInput[] = [{ isDeleted: false }];

  // Search filter across name, email, phone, customerId, or city
  if (filters.searchTerm && filters.searchTerm.trim() !== "") {
    const term = filters.searchTerm.trim();
    andConditions.push({
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { phone: { contains: term, mode: "insensitive" } },
        { customerId: { contains: term, mode: "insensitive" } },
        { addresses: { some: { city: { contains: term, mode: "insensitive" } } } },
      ],
    });
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
          select: customerAddressSelect,
          orderBy: { isDefault: "desc" },
        },
        _count: {
          select: {
            reviews: true,
            cartItems: true,
            wishlistItems: true,
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

const getCustomersSummaryAdmin = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [totalCustomers, activeCustomers, inactiveCustomers, suspendedCustomers, newThisMonth] =
    await Promise.all([
      prisma.customer.count({ where: { isDeleted: false } }),
      prisma.customer.count({ where: { isDeleted: false, status: "ACTIVE" } }),
      prisma.customer.count({ where: { isDeleted: false, status: "INACTIVE" } }),
      prisma.customer.count({ where: { isDeleted: false, status: "SUSPENDED" } }),
      prisma.customer.count({
        where: { isDeleted: false, createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

  return {
    totalCustomers,
    activeCustomers,
    inactiveCustomers,
    suspendedCustomers,
    newThisMonth,
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
      addresses: {
        select: customerAddressSelect,
        orderBy: { isDefault: "desc" },
      },
      _count: {
        select: {
          reviews: true,
          cartItems: true,
          wishlistItems: true,
        },
      },
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
      addresses: {
        select: customerAddressSelect,
      },
      _count: {
        select: {
          reviews: true,
          cartItems: true,
          wishlistItems: true,
        },
      },
    },
  });

  return updated;
};

const updateCustomerStatus = async (
  idOrCustomerId: string,
  status: UserStatus,
) => {
  const customer = await getCustomerById(idOrCustomerId);

  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: { status },
    select: {
      ...safeCustomerSelect,
      addresses: {
        select: customerAddressSelect,
      },
      _count: {
        select: {
          reviews: true,
          cartItems: true,
          wishlistItems: true,
        },
      },
    },
  });

  return updated;
};

const deleteCustomer = async (id: string) => {
  const customer = await prisma.customer.findFirst({
    where: { id, isDeleted: false },
  });

  if (!customer) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Customer not found or already deleted",
    );
  }

  const deleted = await prisma.customer.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
    select: safeCustomerSelect,
  });

  return deleted;
};

// ==================== ADDRESS SERVICE METHODS ====================

const getMyAddresses = async (customerId: string) => {
  const addresses = await prisma.customerAddress.findMany({
    where: { customerId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return addresses;
};

const addAddress = async (
  customerId: string,
  payload: TCreateAddressPayload,
) => {
  const addressCount = await prisma.customerAddress.count({
    where: { customerId },
  });

  const shouldBeDefault = payload.isDefault || addressCount === 0;

  if (shouldBeDefault && addressCount > 0) {
    await prisma.customerAddress.updateMany({
      where: { customerId },
      data: { isDefault: false },
    });
  }

  const address = await prisma.customerAddress.create({
    data: {
      ...payload,
      customerId,
      isDefault: shouldBeDefault,
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

  if (payload.isDefault && !existing.isDefault) {
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

const setDefaultAddress = async (customerId: string, addressId: string) => {
  const existing = await prisma.customerAddress.findFirst({
    where: { id: addressId, customerId },
  });

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Address not found");
  }

  await prisma.customerAddress.updateMany({
    where: { customerId },
    data: { isDefault: false },
  });

  const updated = await prisma.customerAddress.update({
    where: { id: addressId },
    data: { isDefault: true },
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

  if (existing.isDefault) {
    const nextAddress = await prisma.customerAddress.findFirst({
      where: { customerId },
      orderBy: { createdAt: "desc" },
    });

    if (nextAddress) {
      await prisma.customerAddress.update({
        where: { id: nextAddress.id },
        data: { isDefault: true },
      });
    }
  }

  return { message: "Address deleted successfully" };
};

export const CustomerService = {
  searchCustomersForAdmin,
  getAllCustomers,
  getCustomersSummaryAdmin,
  getCustomerById,
  updateCustomer,
  updateCustomerStatus,
  deleteCustomer,
  getMyAddresses,
  addAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
};
