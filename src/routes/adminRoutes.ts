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
    const page = req.query.page ? z.coerce.number().int().positive().parse(req.query.page) : 1;
    const pageSizeRaw = req.query.page_size ? z.coerce.number().int().positive().parse(req.query.page_size) : 20;
    const pageSize = Math.min(100, pageSizeRaw);

    const where = {
      ...(status ? { status } : {}),
      ...(subject ? { subject } : {}),
      ...(teacherId ? { uploadedById: teacherId } : {}),
    } as const;

    const [total, items] = await Promise.all([
      prisma.content.count({ where }),
      prisma.content.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      items,
    });
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

adminRoutes.get("/analytics/subjects", async (req, res, next) => {
  try {
    const from = req.query.from ? z.string().datetime().parse(req.query.from) : undefined;
    const to = req.query.to ? z.string().datetime().parse(req.query.to) : undefined;
    const teacherId = req.query.teacher_id ? z.string().min(1).parse(req.query.teacher_id) : undefined;

    const where = {
      ...(teacherId ? { teacherId } : {}),
      ...(from || to
        ? {
            viewedAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lt: new Date(to) } : {}),
            },
          }
        : {}),
    } as const;

    const rows = await prisma.contentViewEvent.groupBy({
      by: ["subject"],
      where,
      _count: { subject: true },
      orderBy: { _count: { subject: "desc" } },
    });

    const mostActiveSubject = rows.length > 0 ? rows[0].subject : null;
    res.json({
      mostActiveSubject,
      subjects: rows.map((r) => ({
        subject: r.subject,
        views: r._count.subject,
      })),
    });
  } catch (e) {
    next(e);
  }
});

adminRoutes.get("/analytics/content", async (req, res, next) => {
  try {
    const from = req.query.from ? z.string().datetime().parse(req.query.from) : undefined;
    const to = req.query.to ? z.string().datetime().parse(req.query.to) : undefined;
    const teacherId = req.query.teacher_id ? z.string().min(1).parse(req.query.teacher_id) : undefined;
    const subject = req.query.subject ? z.string().min(1).parse(req.query.subject) : undefined;
    const page = req.query.page ? z.coerce.number().int().positive().parse(req.query.page) : 1;
    const pageSizeRaw = req.query.page_size ? z.coerce.number().int().positive().parse(req.query.page_size) : 20;
    const pageSize = Math.min(100, pageSizeRaw);

    const where = {
      ...(teacherId ? { teacherId } : {}),
      ...(subject ? { subject } : {}),
      ...(from || to
        ? {
            viewedAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lt: new Date(to) } : {}),
            },
          }
        : {}),
    } as const;

    const [total, rows] = await Promise.all([
      prisma.contentViewEvent.count({ where }),
      prisma.contentViewEvent.findMany({
        where,
        orderBy: { viewedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          content: {
            select: { id: true, title: true, subject: true, uploadedById: true },
          },
        },
      }),
    ]);

    res.json({
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      items: rows,
    });
  } catch (e) {
    next(e);
  }
});

