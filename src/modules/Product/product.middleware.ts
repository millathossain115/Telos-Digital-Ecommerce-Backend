import multer from "multer";
import httpStatus from "http-status";
import config from "../../config";
import AppError from "../../errors/AppError";
import { PRODUCT_IMAGE_ALLOWED_MIME_TYPES } from "./product.constant";

const storage = multer.memoryStorage();

const productUpload = multer({
  storage,
  limits: {
    fileSize: config.r2.max_file_size_mb * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    if (!PRODUCT_IMAGE_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return callback(
        new AppError(
          httpStatus.BAD_REQUEST,
          "Only JPG, PNG, and WebP product images are allowed",
        ),
      );
    }
    callback(null, true);
  },
});

export const productFilesUpload = productUpload.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "images", maxCount: 10 },
]);

export default productUpload;
