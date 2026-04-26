import { prisma } from "../db/prisma";
import { env } from "../utils/env";

type LiveContent = {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  fileUrl: string;
  startTime: Date;
  endTime: Date;
  rotationDurationMinutes: number;
};

function isEligible(
  now: Date,
  c: { status: string; startTime: Date | null; endTime: Date | null },
) {
  if (c.status !== "approved") return false;
  if (!c.startTime || !c.endTime) return false;
  return c.startTime <= now && now < c.endTime;
}

function toMinutes(ms: number) {
  return Math.floor(ms / 60_000);
}

export function pickActiveScheduledContent<
  T extends {
    durationMinutes: number | null;
    content: { startTime: Date | null };
  },
>(args: {
  now: Date;
  rows: T[];
  defaultRotationMinutes: number;
}): { row: T; effectiveMinutes: number } | null {
  const { now, rows, defaultRotationMinutes } = args;
  if (rows.length === 0) return null;

  const eligible = rows.filter((r) => r.content.startTime);
  if (eligible.length === 0) return null;

  let epoch = eligible[0].content.startTime!;
  for (let i = 1; i < eligible.length; i++) {
    const st = eligible[i].content.startTime!;
    if (st < epoch) epoch = st;
  }

  const elapsedMinutes = Math.max(
    0,
    toMinutes(now.getTime() - epoch.getTime()),
  );
  const durations = eligible.map(
    (r) => r.durationMinutes ?? defaultRotationMinutes,
  );
  const cycle = durations.reduce((a, b) => a + b, 0);
  if (cycle <= 0) return null;

  let t = elapsedMinutes % cycle;
  let idx = 0;
  for (; idx < durations.length; idx++) {
    if (t < durations[idx]) break;
    t -= durations[idx];
  }

  const chosen = eligible[Math.min(idx, eligible.length - 1)];
  const effectiveMinutes = durations[Math.min(idx, durations.length - 1)];
  return { row: chosen, effectiveMinutes };
}

export async function getLiveContentForTeacher(
  teacherId: string,
  subject?: string,
): Promise<LiveContent | null> {
  const now = new Date();

  const schedules = await prisma.contentSchedule.findMany({
    where: { teacherId, ...(subject ? { subject } : {}) },
    orderBy: [{ subject: "asc" }, { rotationOrder: "asc" }],
    include: {
      content: true,
    },
  });

  if (schedules.length === 0) return null;

  type ScheduleRow = (typeof schedules)[number];

  const bySubject = new Map<string, typeof schedules>();
  for (const row of schedules) {
    const arr = bySubject.get(row.subject) ?? [];
    arr.push(row);
    bySubject.set(row.subject, arr);
  }

  const subjects = [...bySubject.keys()].sort();
  for (const subj of subjects) {
    const list = bySubject.get(subj)!;
    const eligible = list.filter((r: ScheduleRow) =>
      isEligible(now, r.content),
    );
    if (eligible.length === 0) continue;

    const picked = pickActiveScheduledContent({
      now,
      rows: eligible.map((r) => ({
        ...r,
        durationMinutes:
          r.durationMinutes ?? r.content.rotationDurationMinutes ?? null,
      })),
      defaultRotationMinutes: env.DEFAULT_ROTATION_MINUTES,
    });
    if (!picked) continue;
    const chosen = picked.row;
    const effectiveMinutes = picked.effectiveMinutes;

    return {
      id: chosen.content.id,
      title: chosen.content.title,
      description: chosen.content.description,
      subject: chosen.content.subject,
      fileUrl: new URL(
        `/uploads/${chosen.content.filePath}`,
        env.PUBLIC_BASE_URL,
      ).toString(),
      startTime: chosen.content.startTime!,
      endTime: chosen.content.endTime!,
      rotationDurationMinutes: effectiveMinutes,
    };
  }

  return null;
}
