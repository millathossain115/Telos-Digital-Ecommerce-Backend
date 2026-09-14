import { UserStatus } from "@prisma/client";

export type TAdminFilterRequest = {
  searchTerm?: string;
  status?: UserStatus;
  startDate?: string;
  endDate?: string;
};

export type TCreateAdminPayload = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  avatar?: string;
};

export type TUpdateAdminPayload = {
  name?: string;
  phone?: string;
  avatar?: string;
  status?: UserStatus;
  password?: string;
};
