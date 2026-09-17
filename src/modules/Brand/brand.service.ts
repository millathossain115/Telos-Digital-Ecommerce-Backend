import { Prisma } from "@prisma/client";
import httpStatus from "http-status";
import path from "path";
import config from "../../config";
import AppError from "../../errors/AppError";
import {
  deletePrivateObject,
  getPrivateObjectSignedUrl,
  uploadPrivateObject,
} from "../../lib/r2";
import prisma from "../../lib/prisma";
import {
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
  BRAND_IMAGE_FOLDER,
  brandSearchableFields,
  brandSortableFields,
} from "./brand.constant";
import {
  TBrandFilterRequest,
  TCreateBrandPayload,
  TUpdateBrandPayload,
} from "./brand.interface";

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

const createUniqueBrandSlug = async (name: string, excludeId?: string) => {
  const baseSlug = slugify(name) || "brand";
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await prisma.brand.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing || existing.id === excludeId) return slug;

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
};

const getPublicImageUrl = (key: string) => {
  if (!config.r2.public_base_url) return key;
  return `${config.r2.public_base_url.replace(/\/$/, "")}/${key}`;
};

const withDisplayImageUrl = async <
  T extends { imageKey: string | null; image: string | null },
>(
  brand: T,
) => {
  if (!brand.imageKey || config.r2.public_base_url) return brand;

  return {
    ...brand,
    image: await getPrivateObjectSignedUrl(brand.imageKey),
  };
};

const withDisplayImageUrls = async <
  T extends { imageKey: string | null; image: string | null },
>(
  brands: T[],
) => Promise.all(brands.map((brand) => withDisplayImageUrl(brand)));

const getExtensionFromFile = (file: Express.Multer.File) => {
  const originalExt = path.extname(file.originalname).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(originalExt)) {
    return originalExt === ".jpeg" ? ".jpg" : originalExt;
  }

  const mimeExtMap: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };

  return mimeExtMap[file.mimetype] || ".jpg";
};

const uploadBrandImage = async (
  file: Express.Multer.File,
  slug: string,
  actorId?: string,
) => {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const extension = getExtensionFromFile(file);
  const key = `${BRAND_IMAGE_FOLDER}/${slug}/brand-${slug}-${timestamp}${extension}`;

  await uploadPrivateObject({
    key,
    body: file.buffer,
    contentType: file.mimetype,
    metadata: {
      ...(actorId && { uploadedBy: actorId }),
      brandSlug: slug,
      originalName: file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-"),
    },
  });

  return {
    image: getPublicImageUrl(key),
    imageKey: key,
  };
};

const getBrandByIdOrThrow = async (id: string) => {
  const brand = await prisma.brand.findFirst({
    where: { id, isDeleted: false },
  });

  if (!brand) {
    throw new AppError(httpStatus.NOT_FOUND, "Brand not found");
  }

  return brand;
};

const createBrand = async (
  payload: TCreateBrandPayload,
  file?: Express.Multer.File,
  actorId?: string,
) => {
  if (payload.isFeaturedMarquee && !file) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Brands featured in the official brands marquee require an image",
    );
  }

  const slug = await createUniqueBrandSlug(payload.name);
  const imagePayload = file
    ? await uploadBrandImage(file, slug, actorId)
    : { image: undefined, imageKey: undefined };

  const brand = await prisma.brand.create({
    data: {
      name: payload.name.trim(),
      slug,
      tagline: payload.tagline?.trim() || null,
      description: payload.description?.trim() || null,
      isActive: payload.isActive ?? true,
      isFeaturedMarquee: payload.isFeaturedMarquee ?? false,
      image: imagePayload.image,
      imageKey: imagePayload.imageKey,
    },
  });

  return withDisplayImageUrl(await getBrandByIdOrThrow(brand.id));
};

const getAllBrands = async (
  filters: TBrandFilterRequest,
  paginationOptions?: IPaginationOptions,
  sortOptions?: ISortOptions,
) => {
  const { page, limit, skip } = calculatePagination(paginationOptions);
  const orderBy = buildSortOrder(
    sortOptions,
    brandSortableFields,
    "createdAt",
    "desc",
  );

  const andConditions: Prisma.BrandWhereInput[] = [{ isDeleted: false }];

  if (filters.searchTerm) {
    const searchFilter = buildSearchFilter(
      filters.searchTerm,
      brandSearchableFields,
    );
    if (searchFilter) andConditions.push(searchFilter);
  }

  if (filters.isActive !== undefined) {
    andConditions.push({ isActive: filters.isActive });
  }

  if (filters.isFeaturedMarquee !== undefined) {
    andConditions.push({ isFeaturedMarquee: filters.isFeaturedMarquee });
  }

  const whereConditions: Prisma.BrandWhereInput = { AND: andConditions };

  const [brands, total] = await Promise.all([
    prisma.brand.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
    }),
    prisma.brand.count({ where: whereConditions }),
  ]);

  return {
    meta: buildPaginationMeta(page, limit, total),
    data: await withDisplayImageUrls(brands),
  };
};

const getMarqueeBrands = async () => {
  return withDisplayImageUrls(
    await prisma.brand.findMany({
      where: {
        isDeleted: false,
        isActive: true,
        isFeaturedMarquee: true,
      },
      orderBy: [{ name: "asc" }],
    }),
  );
};

const getBrandBySlug = async (slug: string) => {
  const brand = await prisma.brand.findFirst({
    where: {
      slug,
      isDeleted: false,
      isActive: true,
    },
  });

  if (!brand) {
    throw new AppError(httpStatus.NOT_FOUND, "Brand not found");
  }

  return withDisplayImageUrl(brand);
};

const getBrandById = async (id: string) => {
  return withDisplayImageUrl(await getBrandByIdOrThrow(id));
};

const updateBrand = async (
  id: string,
  payload: TUpdateBrandPayload,
  file?: Express.Multer.File,
  actorId?: string,
) => {
  const existing = await getBrandByIdOrThrow(id);
  const nextIsFeaturedMarquee =
    payload.isFeaturedMarquee ?? existing.isFeaturedMarquee;
  const willRemoveImage = payload.removeImage === true;

  if (
    nextIsFeaturedMarquee &&
    !file &&
    (willRemoveImage || !existing.image)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Brands featured in the official brands marquee require an image",
    );
  }

  const nextSlug = payload.name
    ? await createUniqueBrandSlug(payload.name, id)
    : existing.slug;
  const nextImagePayload = file
    ? await uploadBrandImage(file, nextSlug, actorId)
    : undefined;

  await prisma.brand.update({
    where: { id },
    data: {
      ...(payload.name && {
        name: payload.name.trim(),
        slug: nextSlug,
      }),
      ...(payload.tagline !== undefined && {
        tagline: payload.tagline?.trim() || null,
      }),
      ...(payload.description !== undefined && {
        description: payload.description?.trim() || null,
      }),
      ...(payload.isActive !== undefined && {
        isActive: payload.isActive,
      }),
      ...(payload.isFeaturedMarquee !== undefined && {
        isFeaturedMarquee: payload.isFeaturedMarquee,
      }),
      ...(nextImagePayload && nextImagePayload),
      ...(willRemoveImage &&
        !file && {
          image: null,
          imageKey: null,
        }),
    },
  });

  const shouldDeleteOldImage =
    existing.imageKey &&
    ((nextImagePayload && nextImagePayload.imageKey !== existing.imageKey) ||
      willRemoveImage);

  if (shouldDeleteOldImage && existing.imageKey) {
    await deletePrivateObject(existing.imageKey).catch(() => undefined);
  }

  return withDisplayImageUrl(await getBrandByIdOrThrow(id));
};

const deleteBrand = async (id: string) => {
  await getBrandByIdOrThrow(id);

  return withDisplayImageUrl(
    await prisma.brand.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
        isFeaturedMarquee: false,
      },
    }),
  );
};

export const BrandService = {
  createBrand,
  getAllBrands,
  getMarqueeBrands,
  getBrandBySlug,
  getBrandById,
  updateBrand,
  deleteBrand,
};
