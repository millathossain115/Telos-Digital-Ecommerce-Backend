export type TAddToCartPayload = {
  productId: string;
  quantity?: number;
  variantId?: string;
};

export type TUpdateCartItemPayload = {
  quantity: number;
};

export type TCartFilterRequest = {
  searchTerm?: string;
  customerId?: string;
  productId?: string;
};

export type TAdminBulkDeleteCartPayload = {
  ids: string[];
};
