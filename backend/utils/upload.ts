import multer, {
  type DiskStorageOptions,
  type Options as MulterOptions,
} from "multer";
import type { Request } from "express";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import { randomUUID } from "node:crypto";

// Directory where uploaded product images will be stored.
// By default this is "<backend>/images", but can be overridden with IMAGE_DIR.


export const imagesDir =
  process.env.IMAGE_DIR ?? path.join(process.cwd(), "uploads");

if (!existsSync(imagesDir)) {
  mkdirSync(imagesDir, { recursive: true });
}

const IMAGE_EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

function uploadTimestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

const storage = multer.diskStorage({
  destination: (
    _req: Request,
    _file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) => {
    cb(null, imagesDir);
  },
  filename: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) => {
    const ext = IMAGE_EXT_BY_MIME[file.mimetype] ?? ".jpg";
    cb(null, `${uploadTimestamp()}-${randomUUID()}${ext}`);
  },
} as DiskStorageOptions);

const fileFilter: MulterOptions["fileFilter"] = (
  _req,
  file,
  cb: multer.FileFilterCallback
) => {
  if (!file.mimetype.startsWith("image/")) {
    cb(new Error("Only image files are allowed"));
    return;
  }
  cb(null, true);
};

// This middleware is used by the `/api/upload-image` endpoint to handle
// a single file field named "file". The main product edit form still sends
// "images" and "banners" directly to GraphQL; this endpoint is only for
// uploading one file at a time from the client-side action.
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
}).single("file");

