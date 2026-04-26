import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { env } from "../utils/env";
import { HttpError } from "../utils/httpErrors";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const authRoutes = Router();

authRoutes.post("/login", async (req, res, next) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new HttpError(401, "Invalid credentials");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new HttpError(401, "Invalid credentials");

    const token = jwt.sign({ role: user.role, email: user.email }, env.JWT_SECRET, {
      subject: user.id,
      expiresIn: "1h"
    });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (e) {
    next(e);
  }
});

