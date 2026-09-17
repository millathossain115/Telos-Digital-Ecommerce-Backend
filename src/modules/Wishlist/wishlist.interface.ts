export type TAddToWishlistPayload = {
  productId: string;
};

export type TWishlistFilterRequest = {
  searchTerm?: string;
  customerId?: string;
  productId?: string;
};

export type TAdminBulkDeleteWishlistPayload = {
  ids: string[];
};
