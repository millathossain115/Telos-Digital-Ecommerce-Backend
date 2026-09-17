import { TRole } from "../../interface";

export type TCustomerRegisterPayload = {
  name?: string;
  fullName?: string;
  email: string;
  password: string;
  phone: string;
};

export type TLoginPayload = {
  email?: string;
  phone?: string;
  mobile?: string;
  identifier?: string;
  password: string;
};

export type TChangePasswordPayload = {
  oldPassword: string;
  newPassword: string;
};

export type TAuthProfileResponse = {
  id: string;
  customerId?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  role: TRole;
  status: string;
  addresses?: Array<{
    id: string;
    title: string | null;
    type: string;
    isDefault: boolean;
    street: string;
    city: string;
    state: string | null;
    postalCode: string | null;
    country: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

export type TAuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: TAuthProfileResponse;
};

export type TUpdateProfilePayload = {
  name?: string;
  avatar?: string;
};

export type TRefreshTokenResponse = {
  accessToken: string;
};
