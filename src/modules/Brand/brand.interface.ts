export type TBrandFilterRequest = {
  searchTerm?: string;
  isActive?: boolean;
  isFeaturedMarquee?: boolean;
};

export type TCreateBrandPayload = {
  name: string;
  tagline?: string;
  description?: string;
  isActive?: boolean;
  isFeaturedMarquee?: boolean;
};

export type TUpdateBrandPayload = Partial<TCreateBrandPayload> & {
  removeImage?: boolean;
};
