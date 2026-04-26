import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    // Keep Prisma CLI usable even when DATABASE_URL isn't set (e.g. `prisma -v`).
    // Commands that actually hit the DB will still fail clearly if this is invalid.
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5432/content_broadcasting?schema=public"
  }
});

