import { Request } from "express";
import fs from "fs";
import multer, { FileFilterCallback } from "multer";
import path from "path";


// Ensure uploads directory exists
// Use /tmp for Vercel serverless environment, otherwise use local uploads
const uploadsDir =
  process.env.NODE_ENV === "production"
    ? "/tmp/uploads"
    : path.join(__dirname, "../../uploads");
const tempDir = path.join(uploadsDir, "temp");

// Helper function to ensure directory exists (with error handling)
const ensureDir = (dir: string) => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (error) {
    console.warn(`Could not create directory ${dir}:`, error);
    // Continue execution - directory will be created on first upload attempt
  }
};

// Try to create directories (non-blocking for serverless)
ensureDir(uploadsDir);
ensureDir(tempDir);

// Configure storage
const storage = multer.diskStorage({
  destination: (_req: Request, _file: any, cb: any) => {
    // Ensure temp directory exists before each upload
    ensureDir(tempDir);
    cb(null, tempDir);
  },
  filename: (_req: Request, file: any, cb: any) => {
    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter to accept only images
const imageFilter = (_req: Request, file: any, cb: FileFilterCallback) => {
  // Allowed image formats
  const allowedMimes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/bmp",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPEG, PNG, GIF, WebP, SVG, and BMP images are allowed."
      )
    );
  }
};

// Configure multer
export const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

// Middleware for single image upload
export const uploadSingle = (fieldName: string) =>
  uploadImage.single(fieldName);

// Middleware for multiple image uploads
export const uploadMultiple = (fieldName: string, maxCount: number = 10) =>
  uploadImage.array(fieldName, maxCount);

// Middleware for multiple fields
export const uploadFields = (
  fields: Array<{ name: string; maxCount?: number }>
) => uploadImage.fields(fields);
