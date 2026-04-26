import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.string().optional().default("development"),
  PORT: z.coerce.number().int().positive().optional().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  UPLOAD_DIR: z.string().optional().default("uploads"),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().optional().default(10),
  DEFAULT_ROTATION_MINUTES: z.coerce.number().int().positive().optional().default(5)
});

export const env = EnvSchema.parse(process.env);

