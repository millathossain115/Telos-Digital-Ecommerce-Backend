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
import { ActivityLogService } from "../ActivityLog/activityLog.service";

const brandListSelect = {
  id: true,
  name: true,
  slug: true,
  tagline: true,
  description: true,
  image: true,
  imageKey: true,
  isActive: true,
  isFeaturedMarquee: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      products: { where: { isDeleted: false } },
    },
  },
};

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
  if (
    !brand.imageKey ||
    brand.imageKey === "external" ||
    brand.imageKey.startsWith("http") ||
    config.r2.public_base_url
  ) {
    return brand;
  }

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
    include: {
      _count: {
        select: {
          products: {
            where: { isDeleted: false },
          },
        },
      },
    },
  });

  if (!brand) {
    throw new AppError(httpStatus.NOT_FOUND, "Brand not found");
  }

  return {
    ...brand,
    itemCount: brand._count?.products ?? 0,
  };
};

const createBrand = async (
  payload: TCreateBrandPayload,
  file?: Express.Multer.File,
  actorId?: string,
) => {
  if (payload.isFeaturedMarquee && !file && !payload.imageUrl) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Brands featured in the official brands marquee require an image",
    );
  }

  const slug = await createUniqueBrandSlug(payload.name);
  let imagePayload: { image?: string; imageKey?: string } = {
    image: undefined,
    imageKey: undefined,
  };

  if (file) {
    imagePayload = await uploadBrandImage(file, slug, actorId);
  } else if (payload.imageUrl && payload.imageUrl.trim()) {
    imagePayload = {
      image: payload.imageUrl.trim(),
      imageKey: "external",
    };
  }

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

  const result = await withDisplayImageUrl(await getBrandByIdOrThrow(brand.id));

  ActivityLogService.logActivity({
    actorName: "Super Admin",
    actorEmail: "admin@teloscart.website",
    actorRole: "System Administrator",
    action: "Published New Brand Partner",
    entity: `Brand: ${result.name}`,
    entityId: result.id,
    category: "CATALOG",
    severity: "SUCCESS",
    details: `Registered brand partner "${result.name}" with slug "${result.slug}".${result.tagline ? ` Tagline: "${result.tagline}"` : ""}`,
  });

  return result;
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
      select: brandListSelect,
    }),
    prisma.brand.count({ where: whereConditions }),
  ]);

  const transformedBrands = brands.map((b) => ({
    ...b,
    itemCount: b._count?.products ?? 0,
  }));

  return {
    meta: buildPaginationMeta(page, limit, total),
    data: await withDisplayImageUrls(transformedBrands),
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
    include: {
      _count: {
        select: {
          products: {
            where: { isDeleted: false },
          },
        },
      },
    },
  });

  if (!brand) {
    throw new AppError(httpStatus.NOT_FOUND, "Brand not found");
  }

  return withDisplayImageUrl({
    ...brand,
    itemCount: brand._count?.products ?? 0,
  });
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
    !payload.imageUrl &&
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

  let nextImagePayload:
    | { image: string | null; imageKey: string | null }
    | undefined = undefined;

  if (file) {
    nextImagePayload = await uploadBrandImage(file, nextSlug, actorId);
  } else if (payload.imageUrl !== undefined) {
    if (payload.imageUrl && payload.imageUrl.trim()) {
      nextImagePayload = {
        image: payload.imageUrl.trim(),
        imageKey: "external",
      };
    } else {
      nextImagePayload = {
        image: null,
        imageKey: null,
      };
    }
  }

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
      ...(nextImagePayload ? nextImagePayload : {}),
      ...(willRemoveImage &&
        !file &&
        payload.imageUrl === undefined && {
          image: null,
          imageKey: null,
        }),
    },
  });

  const shouldDeleteOldImage =
    existing.imageKey &&
    existing.imageKey !== "external" &&
    !existing.imageKey.startsWith("http") &&
    ((nextImagePayload && nextImagePayload.imageKey !== existing.imageKey) ||
      willRemoveImage);

  if (shouldDeleteOldImage && existing.imageKey) {
    await deletePrivateObject(existing.imageKey).catch(() => undefined);
  }

  const result = await withDisplayImageUrl(await getBrandByIdOrThrow(id));

  ActivityLogService.logActivity({
    actorName: "Super Admin",
    actorEmail: "admin@teloscart.website",
    actorRole: "System Administrator",
    action: "Updated Brand Partner",
    entity: `Brand: ${result.name}`,
    entityId: result.id,
    category: "CATALOG",
    severity: "INFO",
    details: `Updated brand metadata and assets for "${result.name}".`,
  });

  return result;
};

const deleteBrand = async (id: string) => {
  await getBrandByIdOrThrow(id);

  const deleted = await prisma.brand.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      isActive: false,
      isFeaturedMarquee: false,
    },
  });

  const result = await withDisplayImageUrl(deleted);

  ActivityLogService.logActivity({
    actorName: "Super Admin",
    actorEmail: "admin@teloscart.website",
    actorRole: "System Administrator",
    action: "Archived Brand Partner",
    entity: `Brand: ${result.name}`,
    entityId: result.id,
    category: "CATALOG",
    severity: "WARNING",
    details: `Archived brand "${result.name}" from active catalog and cleared marquee feature.`,
  });

  return result;
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
