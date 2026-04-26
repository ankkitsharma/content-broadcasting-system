import fs from "node:fs";
import path from "node:path";

import multer from "multer";

import { env } from "../utils/env";
import { HttpError } from "../utils/httpErrors";

const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
fs.mkdirSync(uploadDir, { recursive: true });

const allowedMime = new Set(["image/jpeg", "image/png", "image/gif"]);

export const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}_${safe}`);
    }
  }),
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMime.has(file.mimetype)) return cb(new HttpError(400, "Unsupported file type"));
    cb(null, true);
  }
});

