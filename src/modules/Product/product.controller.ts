import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { ProductService } from "./product.service";

const parseBooleanQuery = (value: unknown) => {
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return undefined;
};

const createProduct = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const result = await ProductService.createProduct(req.body, {
    thumbnail: files?.thumbnail,
    images: files?.images,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Product created successfully",
    data: result,
  });
});

const getAllProducts = catchAsync(async (req: Request, res: Response) => {
  const {
    searchTerm,
    categoryId,
    subCategoryId,
    brandId,
    minPrice,
    maxPrice,
    hasVoucher,
    isFeatured,
    isFlashDeal,
    stockStatus,
    page,
    limit,
    sortBy,
    sortOrder,
  } = req.query;

  const result = await ProductService.getAllProducts(
    {
      searchTerm: searchTerm as string,
      categoryId: categoryId as string,
      subCategoryId: subCategoryId as string,
      brandId: brandId as string,
      minPrice: minPrice as string,
      maxPrice: maxPrice as string,
      hasVoucher: parseBooleanQuery(hasVoucher),
      isFeatured: parseBooleanQuery(isFeatured),
      isFlashDeal: parseBooleanQuery(isFlashDeal),
      stockStatus: stockStatus as any,
    },
    { page: page as string, limit: limit as string },
    { sortBy: sortBy as string, sortOrder: sortOrder as string },
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Products retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getAllProductsAdmin = catchAsync(async (req: Request, res: Response) => {
  const {
    searchTerm,
    categoryId,
    subCategoryId,
    brandId,
    isActive,
    isFeatured,
    isFlashDeal,
    stockStatus,
    stockFilter,
    minStock,
    maxStock,
    page,
    limit,
    sortBy,
    sortOrder,
  } = req.query;

  const result = await ProductService.getAllProductsAdmin(
    {
      searchTerm: searchTerm as string,
      categoryId: categoryId as string,
      subCategoryId: subCategoryId as string,
      brandId: brandId as string,
      isActive: parseBooleanQuery(isActive),
      isFeatured: parseBooleanQuery(isFeatured),
      isFlashDeal: parseBooleanQuery(isFlashDeal),
      stockStatus: stockStatus as any,
      stockFilter: stockFilter as string,
      minStock: minStock as string,
      maxStock: maxStock as string,
    },
    { page: page as string, limit: limit as string },
    { sortBy: sortBy as string, sortOrder: sortOrder as string },
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin products retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getProductBySlug = catchAsync(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const result = await ProductService.getProductBySlug(slug);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Product retrieved successfully",
    data: result,
  });
});

const getProductById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ProductService.getProductById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Product retrieved successfully",
    data: result,
  });
});

const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const result = await ProductService.updateProduct(id, req.body, {
    thumbnail: files?.thumbnail,
    images: files?.images,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Product updated successfully",
    data: result,
  });
});

const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ProductService.deleteProduct(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Product deleted successfully",
    data: result,
  });
});

const getInventorySummary = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.getInventorySummary();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Inventory stock summary retrieved successfully",
    data: result,
  });
});

export const ProductController = {
  createProduct,
  getAllProducts,
  getAllProductsAdmin,
  getInventorySummary,
  getProductBySlug,
  getProductById,
  updateProduct,
  deleteProduct,
};
