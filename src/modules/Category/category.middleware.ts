import multer from "multer";
import httpStatus from "http-status";
import config from "../../config";
import AppError from "../../errors/AppError";
import { CATEGORY_IMAGE_ALLOWED_MIME_TYPES } from "./category.constant";

const storage = multer.memoryStorage();

const categoryImageUpload = multer({
  storage,
  limits: {
    fileSize: config.r2.max_file_size_mb * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    if (!CATEGORY_IMAGE_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return callback(
        new AppError(
          httpStatus.BAD_REQUEST,
          "Only JPG, PNG, and WebP category images are allowed",
        ),
      );
    }

    callback(null, true);
  },
});

export default categoryImageUpload;
