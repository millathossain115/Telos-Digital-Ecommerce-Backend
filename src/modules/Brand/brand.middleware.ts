import multer from "multer";
import httpStatus from "http-status";
import config from "../../config";
import AppError from "../../errors/AppError";
import { BRAND_IMAGE_ALLOWED_MIME_TYPES } from "./brand.constant";

const storage = multer.memoryStorage();

const brandImageUpload = multer({
  storage,
  limits: {
    fileSize: config.r2.max_file_size_mb * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    if (!BRAND_IMAGE_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return callback(
        new AppError(
          httpStatus.BAD_REQUEST,
          "Only JPG, PNG, and WebP brand images are allowed",
        ),
      );
    }

    callback(null, true);
  },
});

export default brandImageUpload;
