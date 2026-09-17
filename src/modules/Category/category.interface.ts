export type TCategoryFilterRequest = {
  searchTerm?: string;
  isActive?: boolean;
  isFeaturedHomepage?: boolean;
};

export type TSubCategoryPayload = {
  name: string;
  description?: string;
  isActive?: boolean;
};

export type TCreateCategoryPayload = {
  name: string;
  description?: string;
  icon?: string;
  subCategories?: TSubCategoryPayload[] | string;
  isActive?: boolean;
  isFeaturedHomepage?: boolean;
  imageUrl?: string;
};

export type TUpdateCategoryPayload = Partial<TCreateCategoryPayload> & {
  removeImage?: boolean;
};
