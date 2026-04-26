import { Router } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { HttpError } from "../utils/httpErrors";

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireRole("principal"));

adminRoutes.get("/content", async (req, res, next) => {
  try {
    const status = req.query.status ? z.enum(["pending", "approved", "rejected"]).parse(req.query.status) : undefined;
    const subject = req.query.subject ? z.string().min(1).parse(req.query.subject) : undefined;
    const teacherId = req.query.teacher_id ? z.string().min(1).parse(req.query.teacher_id) : undefined;

    const items = await prisma.content.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(subject ? { subject } : {}),
        ...(teacherId ? { uploadedById: teacherId } : {})
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(items);
  } catch (e) {
    next(e);
  }
});

adminRoutes.get("/content/pending", async (_req, res, next) => {
  try {
    const items = await prisma.content.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" }
    });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

adminRoutes.post("/content/:id/approve", async (req, res, next) => {
  try {
    const id = z.string().min(1).parse(req.params.id);
    const existing = await prisma.content.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Content not found");
    if (existing.status === "rejected") throw new HttpError(409, "Cannot approve rejected content");
    if (existing.status === "approved") return res.json(existing);

    const updated = await prisma.content.update({
      where: { id },
      data: {
        status: "approved",
        approvedById: req.user!.id,
        approvedAt: new Date(),
        rejectionReason: null
      }
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

adminRoutes.post("/content/:id/reject", async (req, res, next) => {
  try {
    const id = z.string().min(1).parse(req.params.id);
    const rejection_reason = z.object({ rejection_reason: z.string().min(1) }).parse(req.body).rejection_reason;

    const existing = await prisma.content.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Content not found");
    if (existing.status === "approved") throw new HttpError(409, "Cannot reject approved content");
    if (existing.status === "rejected") return res.json(existing);

    const updated = await prisma.content.update({
      where: { id },
      data: {
        status: "rejected",
        rejectionReason: rejection_reason,
        approvedById: null,
        approvedAt: null
      }
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

