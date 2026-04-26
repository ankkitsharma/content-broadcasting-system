import type { NextFunction, Request, Response } from "express";

import { HttpError } from "../utils/httpErrors";
import type { AuthUser } from "./requireAuth";

export function requireRole(role: AuthUser["role"]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new HttpError(401, "Unauthorized"));
    if (req.user.role !== role) return next(new HttpError(403, "Forbidden"));
    return next();
  };
}

