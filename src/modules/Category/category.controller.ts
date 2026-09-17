import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { CategoryService } from "./category.service";

const parseBooleanQuery = (value: unknown) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.createCategory(
    req.body,
    req.file,
    req.user?.id,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Category created successfully",
    data: result,
  });
});

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const {
    searchTerm,
    isActive,
    isFeaturedHomepage,
    page,
    limit,
    sortBy,
    sortOrder,
  } = req.query;

  const result = await CategoryService.getAllCategories(
    {
      searchTerm: searchTerm as string,
      isActive: parseBooleanQuery(isActive),
      isFeaturedHomepage: parseBooleanQuery(isFeaturedHomepage),
    },
    { page: page as string, limit: limit as string },
    { sortBy: sortBy as string, sortOrder: sortOrder as string },
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Categories retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getParentCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.getParentCategories();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Parent categories retrieved successfully",
    data: result,
  });
});

const getCategoryTree = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.getCategoryTree();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category tree retrieved successfully",
    data: result,
  });
});

const getFeaturedHomepageCategories = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CategoryService.getFeaturedHomepageCategories();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Featured homepage categories retrieved successfully",
      data: result,
    });
  },
);

const getCategoryBySlug = catchAsync(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const result = await CategoryService.getCategoryBySlug(slug);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category retrieved successfully",
    data: result,
  });
});

const getCategoryById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CategoryService.getCategoryById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category retrieved successfully",
    data: result,
  });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CategoryService.updateCategory(
    id,
    req.body,
    req.file,
    req.user?.id,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category updated successfully",
    data: result,
  });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CategoryService.deleteCategory(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category deleted successfully",
    data: result,
  });
});

const createSubCategory = catchAsync(async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  const result = await CategoryService.createSubCategory(categoryId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Subcategory created successfully",
    data: result,
  });
});

const updateSubCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CategoryService.updateSubCategory(id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subcategory updated successfully",
    data: result,
  });
});

const deleteSubCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CategoryService.deleteSubCategory(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subcategory deleted successfully",
    data: result,
  });
});

export const CategoryController = {
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
