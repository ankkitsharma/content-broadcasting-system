import { Router } from "express";

import { authRoutes } from "./authRoutes";
import { contentRoutes } from "./contentRoutes";
import { adminRoutes } from "./adminRoutes";

export const routes = Router();

routes.use("/auth", authRoutes);
routes.use("/content", contentRoutes);
routes.use("/admin", adminRoutes);

