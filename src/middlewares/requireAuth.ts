import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../utils/env";
import { HttpError } from "../utils/httpErrors";

export type AuthUser = {
  id: string;
  role: "principal" | "teacher";
  email: string;
};

type JwtPayload = { sub: string; role: AuthUser["role"]; email: string };

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (!header) return next(new HttpError(401, "Missing Authorization header"));

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return next(new HttpError(401, "Invalid Authorization header"));

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    return next();
  } catch {
    return next(new HttpError(401, "Invalid token"));
  }
}

