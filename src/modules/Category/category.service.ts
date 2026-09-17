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
  CATEGORY_IMAGE_FOLDER,
  categorySearchableFields,
  categorySortableFields,
} from "./category.constant";
import {
  TCategoryFilterRequest,
  TCreateCategoryPayload,
  TSubCategoryPayload,
  TUpdateCategoryPayload,
} from "./category.interface";

const categoryInclude = {
  subCategories: {
    where: {
      isDeleted: false,
    },
    orderBy: [{ name: "asc" as const }],
  },
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

const createUniqueCategorySlug = async (name: string, excludeId?: string) => {
  const baseSlug = slugify(name) || "category";
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing || existing.id === excludeId) return slug;

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
};

const createUniqueSubCategorySlug = async (
  categoryId: string,
  name: string,
  excludeId?: string,
) => {
  const baseSlug = slugify(name) || "sub-category";
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await prisma.subCategory.findFirst({
      where: {
        categoryId,
        slug,
      },
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

const withDisplayImageUrl = async <T extends { imageKey: string | null; image: string | null }>(
  category: T,
) => {
  if (!category.imageKey || config.r2.public_base_url) return category;

  return {
    ...category,
    image: await getPrivateObjectSignedUrl(category.imageKey),
  };
};

const withDisplayImageUrls = async <
  T extends { imageKey: string | null; image: string | null },
>(
  categories: T[],
) => Promise.all(categories.map((category) => withDisplayImageUrl(category)));

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

const uploadCategoryImage = async (
  file: Express.Multer.File,
  slug: string,
  actorId?: string,
) => {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const extension = getExtensionFromFile(file);
  const key = `${CATEGORY_IMAGE_FOLDER}/${slug}/category-image-${slug}-${timestamp}${extension}`;

  await uploadPrivateObject({
    key,
    body: file.buffer,
    contentType: file.mimetype,
    metadata: {
      ...(actorId && { uploadedBy: actorId }),
      categorySlug: slug,
      originalName: file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-"),
    },
  });

  return {
    image: getPublicImageUrl(key),
    imageKey: key,
  };
};

const parseSubCategories = (
  value: TCreateCategoryPayload["subCategories"],
): TSubCategoryPayload[] => {
  if (!value) return [];

  let parsed: unknown;
  try {
    parsed = typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Invalid subCategories JSON payload",
    );
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item) => ({
      name: String(item?.name || "").trim(),
      description: item?.description
        ? String(item.description).trim()
        : undefined,
      isActive: item?.isActive ?? true,
    }))
    .filter((item) => item.name.length >= 2);
};

const getCategoryByIdOrThrow = async (id: string) => {
  const category = await prisma.category.findFirst({
    where: { id, isDeleted: false },
    include: categoryInclude,
  });

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Category not found");
  }

  return category;
};

const getSubCategoryByIdOrThrow = async (id: string) => {
  const subCategory = await prisma.subCategory.findFirst({
    where: { id, isDeleted: false },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!subCategory) {
    throw new AppError(httpStatus.NOT_FOUND, "Subcategory not found");
  }

  return subCategory;
};

const createCategory = async (
  payload: TCreateCategoryPayload,
  file?: Express.Multer.File,
  actorId?: string,
) => {
  if (payload.isFeaturedHomepage && !file) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Featured homepage categories require an image",
    );
  }

  const slug = await createUniqueCategorySlug(payload.name);
  const imagePayload = file
    ? await uploadCategoryImage(file, slug, actorId)
    : { image: undefined, imageKey: undefined };
  const subCategories = parseSubCategories(payload.subCategories);

  const category = await prisma.category.create({
    data: {
      name: payload.name.trim(),
      slug,
      description: payload.description?.trim() || null,
      icon: payload.icon?.trim() || null,
      isActive: payload.isActive ?? true,
      isFeaturedHomepage: payload.isFeaturedHomepage ?? false,
      image: imagePayload.image,
      imageKey: imagePayload.imageKey,
    },
  });

  await Promise.all(
    subCategories.map(async (subCategory) =>
      prisma.subCategory.create({
        data: {
          categoryId: category.id,
          name: subCategory.name,
          slug: await createUniqueSubCategorySlug(
            category.id,
            subCategory.name,
          ),
          description: subCategory.description || null,
          isActive: subCategory.isActive ?? true,
        },
      }),
    ),
  );

  return withDisplayImageUrl(await getCategoryByIdOrThrow(category.id));
};

const getAllCategories = async (
  filters: TCategoryFilterRequest,
  paginationOptions?: IPaginationOptions,
  sortOptions?: ISortOptions,
) => {
  const { page, limit, skip } = calculatePagination(paginationOptions);
  const orderBy = buildSortOrder(
    sortOptions,
    categorySortableFields,
    "createdAt",
    "desc",
  );

  const andConditions: Prisma.CategoryWhereInput[] = [{ isDeleted: false }];

  if (filters.searchTerm) {
    const searchFilter = buildSearchFilter(
      filters.searchTerm,
      categorySearchableFields,
    );
    if (searchFilter) andConditions.push(searchFilter);
  }

  if (filters.isActive !== undefined) {
    andConditions.push({ isActive: filters.isActive });
  }

  if (filters.isFeaturedHomepage !== undefined) {
    andConditions.push({ isFeaturedHomepage: filters.isFeaturedHomepage });
  }

  const whereConditions: Prisma.CategoryWhereInput = { AND: andConditions };

  const [categories, total] = await Promise.all([
    prisma.category.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      include: categoryInclude,
    }),
    prisma.category.count({ where: whereConditions }),
  ]);

  return {
    meta: buildPaginationMeta(page, limit, total),
    data: await withDisplayImageUrls(categories),
  };
};

const getParentCategories = async () => {
  return prisma.category.findMany({
    where: {
      isDeleted: false,
    },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });
};

const getCategoryTree = async () => {
  return withDisplayImageUrls(await prisma.category.findMany({
    where: {
      isDeleted: false,
      isActive: true,
    },
    orderBy: [{ name: "asc" }],
    include: {
      subCategories: {
        where: {
          isDeleted: false,
          isActive: true,
        },
        orderBy: [{ name: "asc" }],
      },
    },
  }));
};

const getFeaturedHomepageCategories = async () => {
  return withDisplayImageUrls(await prisma.category.findMany({
    where: {
      isDeleted: false,
      isActive: true,
      isFeaturedHomepage: true,
    },
    orderBy: [{ name: "asc" }],
    include: categoryInclude,
  }));
};

const getCategoryBySlug = async (slug: string) => {
  const category = await prisma.category.findFirst({
    where: {
      slug,
      isDeleted: false,
      isActive: true,
    },
    include: categoryInclude,
  });

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Category not found");
  }

  return withDisplayImageUrl(category);
};

const getCategoryById = async (id: string) => {
  return withDisplayImageUrl(await getCategoryByIdOrThrow(id));
};

const updateCategory = async (
  id: string,
  payload: TUpdateCategoryPayload,
  file?: Express.Multer.File,
  actorId?: string,
) => {
  const existing = await getCategoryByIdOrThrow(id);
  const nextIsFeatured =
    payload.isFeaturedHomepage ?? existing.isFeaturedHomepage;
  const willRemoveImage = payload.removeImage === true;

  if (nextIsFeatured && !file && (willRemoveImage || !existing.image)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Featured homepage categories require an image",
    );
  }

  const nextSlug = payload.name
    ? await createUniqueCategorySlug(payload.name, id)
    : existing.slug;
  const nextImagePayload = file
    ? await uploadCategoryImage(file, nextSlug, actorId)
    : undefined;

  await prisma.category.update({
    where: { id },
    data: {
      ...(payload.name && {
        name: payload.name.trim(),
        slug: nextSlug,
      }),
      ...(payload.description !== undefined && {
        description: payload.description?.trim() || null,
      }),
      ...(payload.icon !== undefined && {
        icon: payload.icon?.trim() || null,
      }),
      ...(payload.isActive !== undefined && {
        isActive: payload.isActive,
      }),
      ...(payload.isFeaturedHomepage !== undefined && {
        isFeaturedHomepage: payload.isFeaturedHomepage,
      }),
      ...(nextImagePayload && nextImagePayload),
      ...(willRemoveImage &&
        !file && {
          image: null,
          imageKey: null,
        }),
    },
  });

  if (payload.subCategories !== undefined) {
    const nextSubCategories = parseSubCategories(payload.subCategories);
    const existingSubCategories = await prisma.subCategory.findMany({
      where: {
        categoryId: id,
        isDeleted: false,
      },
    });
    const nextNames = nextSubCategories.map((item) => item.name.toLowerCase());

    await Promise.all([
      ...existingSubCategories
        .filter((item) => !nextNames.includes(item.name.toLowerCase()))
        .map((item) =>
          prisma.subCategory.update({
            where: { id: item.id },
            data: {
              isDeleted: true,
              deletedAt: new Date(),
              isActive: false,
            },
          }),
        ),
      ...nextSubCategories
        .filter(
          (item) =>
            !existingSubCategories.some(
              (existingItem) =>
                existingItem.name.toLowerCase() === item.name.toLowerCase(),
            ),
        )
        .map(async (item) =>
          prisma.subCategory.create({
            data: {
              categoryId: id,
              name: item.name,
              slug: await createUniqueSubCategorySlug(id, item.name),
              description: item.description || null,
              isActive: item.isActive ?? true,
            },
          }),
        ),
    ]);
  }

  const shouldDeleteOldImage =
    existing.imageKey &&
    ((nextImagePayload && nextImagePayload.imageKey !== existing.imageKey) ||
      willRemoveImage);

  if (shouldDeleteOldImage && existing.imageKey) {
    await deletePrivateObject(existing.imageKey).catch(() => undefined);
  }

  return withDisplayImageUrl(await getCategoryByIdOrThrow(id));
};

const deleteCategory = async (id: string) => {
  await getCategoryByIdOrThrow(id);

  return withDisplayImageUrl(await prisma.category.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      isActive: false,
      isFeaturedHomepage: false,
      subCategories: {
        updateMany: {
          where: { isDeleted: false },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
            isActive: false,
          },
        },
      },
    },
    include: categoryInclude,
  }));
};

const createSubCategory = async (
  categoryId: string,
  payload: TSubCategoryPayload,
) => {
  await getCategoryByIdOrThrow(categoryId);
  const slug = await createUniqueSubCategorySlug(categoryId, payload.name);

  return prisma.subCategory.create({
    data: {
      categoryId,
      name: payload.name.trim(),
      slug,
      description: payload.description?.trim() || null,
      isActive: payload.isActive ?? true,
    },
  });
};

const updateSubCategory = async (
  id: string,
  payload: Partial<TSubCategoryPayload>,
) => {
  const existing = await getSubCategoryByIdOrThrow(id);
  const nextSlug = payload.name
    ? await createUniqueSubCategorySlug(existing.categoryId, payload.name, id)
    : existing.slug;

  return prisma.subCategory.update({
    where: { id },
    data: {
      ...(payload.name && {
        name: payload.name.trim(),
        slug: nextSlug,
      }),
      ...(payload.description !== undefined && {
        description: payload.description?.trim() || null,
      }),
      ...(payload.isActive !== undefined && {
        isActive: payload.isActive,
      }),
    },
  });
};

const deleteSubCategory = async (id: string) => {
  await getSubCategoryByIdOrThrow(id);

  return prisma.subCategory.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      isActive: false,
    },
  });
};

export const CategoryService = {
  createCategory,
  getAllCategories,
  getParentCategories,
  getCategoryTree,
  getFeaturedHomepageCategories,
  getCategoryBySlug,
  getCategoryById,
  updateCategory,
  deleteCategory,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
};
