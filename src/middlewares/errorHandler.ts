import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/httpErrors";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const message = err instanceof Error ? err.message : "Internal server error";
  const status =
    err instanceof HttpError
      ? err.status
      : err instanceof ZodError
        ? 400
      : typeof (err as any)?.status === "number"
        ? (err as any).status
        : 500;

  if (err instanceof ZodError) {
    return res.status(400).json({ message: JSON.stringify(err.issues, null, 2) });
  }

  res.status(status).json({ message });
}

