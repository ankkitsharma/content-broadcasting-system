import type { AuthUser } from "../middlewares/requireAuth";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};

