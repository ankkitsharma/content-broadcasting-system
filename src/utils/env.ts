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
});

const base = BaseEnvSchema.parse(process.env);

export const env = {
  ...base,
  PUBLIC_BASE_URL: base.PUBLIC_BASE_URL ?? `http://localhost:${base.PORT}`,
};

