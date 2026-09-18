import { ReviewStatus } from "@prisma/client";

export type TCreateReviewPayload = {
  productId: string;
  rating: number;
  title?: string;
  comment?: string;
};

export type TReviewFilterRequest = {
  productId?: string;
  customerId?: string;
  rating?: string | number;
};

export type TAdminReviewFilterRequest = {
  searchTerm?: string;
  status?: string;
  rating?: string | number;
  productId?: string;
  customerId?: string;
  isVisible?: string | boolean;
};

export type TUpdateReviewStatusPayload = {
  status?: ReviewStatus | string;
  isVisible?: boolean;
};
