import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import swaggerUi from "swagger-ui-express";

import { errorHandler } from "./middlewares/errorHandler";
import { notFoundHandler } from "./middlewares/notFoundHandler";
import { routes } from "./routes";
import { env } from "./utils/env";

export function createApp() {
  const app = express();

  // Add this BEFORE your routes
  app.set("trust proxy", 1);

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  const openApiPath = path.resolve(process.cwd(), "openapi.yaml");
  if (fs.existsSync(openApiPath)) {
    const spec = YAML.parse(fs.readFileSync(openApiPath, "utf8"));
    // Ensure the "Try it out" base URL matches the deployment.
    spec.servers = [{ url: env.PUBLIC_BASE_URL }];
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
  }

  app.use(
    "/uploads",
    express.static(path.resolve(process.cwd(), env.UPLOAD_DIR)),
  );

  app.use(routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
