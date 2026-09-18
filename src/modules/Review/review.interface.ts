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
