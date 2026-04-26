import { Router } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { upload } from "../middlewares/upload";
import { HttpError } from "../utils/httpErrors";
import { getLiveContentForTeacher } from "../services/rotationService";

const SubjectSchema = z.string().min(1);

const UploadSchema = z.object({
  title: z.string().min(1),
  subject: SubjectSchema,
  description: z.string().optional(),
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
  rotation_duration_minutes: z.coerce.number().int().nonnegative().optional()
});

const ScheduleSchema = z.object({
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  rotation_duration_minutes: z.coerce.number().int().nonnegative().optional()
});

const RotationSchema = z.object({
  subject: SubjectSchema,
  rotation_order: z.coerce.number().int().nonnegative(),
  duration_minutes: z.coerce.number().int().positive().optional()
});

export const contentRoutes = Router();

contentRoutes.get("/live/:teacherId", async (req, res, next) => {
  try {
    const teacherId = z.string().min(1).parse(req.params.teacherId);
    const subject = req.query.subject ? z.string().min(1).parse(req.query.subject) : undefined;

    const live = await getLiveContentForTeacher(teacherId, subject);
    if (!live) return res.json({ message: "No content available" });
    res.json(live);
  } catch (e) {
    next(e);
  }
});

contentRoutes.post(
  "/",
  requireAuth,
  requireRole("teacher"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) throw new HttpError(400, "Missing file");

      const parsed = UploadSchema.parse(req.body);

      const startTime = parsed.start_time ? new Date(parsed.start_time) : null;
      const endTime = parsed.end_time ? new Date(parsed.end_time) : null;
      if ((startTime && !endTime) || (!startTime && endTime)) {
        throw new HttpError(400, "start_time and end_time must both be provided");
      }
      if (startTime && endTime && startTime >= endTime) throw new HttpError(400, "start_time must be < end_time");

      const created = await prisma.$transaction(async (tx) => {
        const content = await tx.content.create({
          data: {
            title: parsed.title,
            subject: parsed.subject,
            description: parsed.description,
            filePath: req.file!.filename,
            fileType: req.file!.mimetype,
            fileSize: req.file!.size,
            uploadedById: req.user!.id,
            status: "pending",
            startTime,
            endTime,
            rotationDurationMinutes:
              parsed.rotation_duration_minutes && parsed.rotation_duration_minutes > 0 ? parsed.rotation_duration_minutes : null
          }
        });

        const existing = await tx.contentSchedule.findMany({
          where: { teacherId: req.user!.id, subject: parsed.subject },
          select: { rotationOrder: true }
        });
        const maxOrder = existing.reduce((m, r) => Math.max(m, r.rotationOrder), -1);
        const nextOrder = maxOrder + 1;

        await tx.contentSchedule.create({
          data: {
            teacherId: req.user!.id,
            subject: parsed.subject,
            contentId: content.id,
            rotationOrder: nextOrder,
            durationMinutes: null
          }
        });

        return content;
      });

      res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  }
);

contentRoutes.get("/mine", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const items = await prisma.content.findMany({
      where: { uploadedById: req.user!.id },
      orderBy: { createdAt: "desc" }
    });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

contentRoutes.put("/:id/schedule", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const id = z.string().min(1).parse(req.params.id);
    const { start_time, end_time, rotation_duration_minutes } = ScheduleSchema.parse(req.body);
    const startTime = new Date(start_time);
    const endTime = new Date(end_time);
    if (startTime >= endTime) throw new HttpError(400, "start_time must be < end_time");

    const existing = await prisma.content.findUnique({ where: { id } });
    if (!existing || existing.uploadedById !== req.user!.id) throw new HttpError(404, "Content not found");

    const updated = await prisma.content.update({
      where: { id },
      data: {
        startTime,
        endTime,
        rotationDurationMinutes: rotation_duration_minutes ?? existing.rotationDurationMinutes
      }
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

contentRoutes.put("/:id/rotation", requireAuth, requireRole("teacher"), async (req, res, next) => {
  try {
    const contentId = z.string().min(1).parse(req.params.id);
    const { subject, rotation_order, duration_minutes } = RotationSchema.parse(req.body);

    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (!content || content.uploadedById !== req.user!.id) throw new HttpError(404, "Content not found");

    const upserted = await prisma.contentSchedule.upsert({
      where: {
        teacherId_subject_rotationOrder: {
          teacherId: req.user!.id,
          subject,
          rotationOrder: rotation_order
        }
      },
      update: { contentId, durationMinutes: duration_minutes ?? null },
      create: {
        teacherId: req.user!.id,
        subject,
        contentId,
        rotationOrder: rotation_order,
        durationMinutes: duration_minutes ?? null
      }
    });

    res.json(upserted);
  } catch (e) {
    next(e);
  }
});

