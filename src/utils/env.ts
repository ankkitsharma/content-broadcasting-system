import { z } from "zod";

const BaseEnvSchema = z.object({
  NODE_ENV: z.string().optional().default("development"),
  PORT: z.coerce.number().int().positive().optional().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  // Publicly reachable base URL for absolute links & OpenAPI servers.
  // Examples:
  // - http://localhost:3000
  // - https://api.yourdomain.com
  PUBLIC_BASE_URL: z.string().url().optional(),
  UPLOAD_DIR: z.string().optional().default("uploads"),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().optional().default(10),
  DEFAULT_ROTATION_MINUTES: z.coerce.number().int().positive().optional().default(5),

  // Optional: enables Redis caching when provided.
  REDIS_URL: z.string().min(1).optional(),
  LIVE_CONTENT_CACHE_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(15),

  PUBLIC_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(60_000),
  PUBLIC_RATE_LIMIT_MAX: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(60),

  STORAGE_PROVIDER: z.enum(["local", "s3"]).optional().default("local"),

  // S3-compatible config (Cloudflare R2, AWS S3, etc.)
  // Required when STORAGE_PROVIDER="s3".
  S3_ENDPOINT: z.string().min(1).optional(),
  S3_REGION: z.string().min(1).optional().default("auto"),
  S3_BUCKET: z.string().min(1).optional(),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  // Base URL used to form public object URLs:
  // `${S3_PUBLIC_BASE_URL}/${key}`
  S3_PUBLIC_BASE_URL: z.string().url().optional(),
  // R2 works best with path-style access enabled.
  S3_FORCE_PATH_STYLE: z.coerce.boolean().optional().default(true),
});

const base = BaseEnvSchema.parse(process.env);

export const env = {
  ...base,
  PUBLIC_BASE_URL: base.PUBLIC_BASE_URL ?? `http://localhost:${base.PORT}`,
};

