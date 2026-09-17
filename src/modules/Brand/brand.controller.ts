import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { BrandService } from "./brand.service";

const parseBooleanQuery = (value: unknown) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

const createBrand = catchAsync(async (req: Request, res: Response) => {
  const result = await BrandService.createBrand(req.body, req.file, req.user?.id);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Brand created successfully",
    data: result,
  });
});

const getAllBrands = catchAsync(async (req: Request, res: Response) => {
  const {
    searchTerm,
    isActive,
    isFeaturedMarquee,
    page,
    limit,
    sortBy,
    sortOrder,
  } = req.query;

  const result = await BrandService.getAllBrands(
    {
      searchTerm: searchTerm as string,
      isActive: parseBooleanQuery(isActive),
      isFeaturedMarquee: parseBooleanQuery(isFeaturedMarquee),
    },
    { page: page as string, limit: limit as string },
    { sortBy: sortBy as string, sortOrder: sortOrder as string },
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Brands retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getMarqueeBrands = catchAsync(async (req: Request, res: Response) => {
  const result = await BrandService.getMarqueeBrands();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Official brands marquee retrieved successfully",
    data: result,
  });
});

const getBrandBySlug = catchAsync(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const result = await BrandService.getBrandBySlug(slug);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Brand retrieved successfully",
    data: result,
  });
});

const getBrandById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await BrandService.getBrandById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Brand retrieved successfully",
    data: result,
  });
});

const updateBrand = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await BrandService.updateBrand(
    id,
    req.body,
    req.file,
    req.user?.id,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Brand updated successfully",
    data: result,
  });
});

const deleteBrand = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await BrandService.deleteBrand(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Brand deleted successfully",
    data: result,
  });
});

export const BrandController = {
  createBrand,
  getAllBrands,
  getMarqueeBrands,
  getBrandBySlug,
  getBrandById,
  updateBrand,
  deleteBrand,
};
