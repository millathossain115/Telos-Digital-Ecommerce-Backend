import { AddressType, UserStatus } from "@prisma/client";

export type TCustomerFilterRequest = {
  searchTerm?: string;
  status?: UserStatus;
  startDate?: string;
  endDate?: string;
};

export type TUpdateCustomerPayload = {
  name?: string;
  phone?: string;
  avatar?: string;
  status?: UserStatus;
};

export type TCreateAddressPayload = {
  title?: string;
  type?: AddressType;
  isDefault?: boolean;
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

export type TUpdateAddressPayload = Partial<TCreateAddressPayload>;
