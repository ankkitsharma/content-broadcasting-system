import { describe, expect, it, vi } from "vitest";

vi.mock("../src/db/prisma", () => {
  return {
    prisma: {
      contentSchedule: { findMany: vi.fn() },
    },
  };
});

import { pickActiveScheduledContent } from "../src/services/rotationService";

describe("pickActiveScheduledContent", () => {
  it("returns null for empty rows", () => {
    const res = pickActiveScheduledContent({
      now: new Date(),
      rows: [],
      defaultRotationMinutes: 5,
    });
    expect(res).toBeNull();
  });

  it("selects the only item", () => {
    const epoch = new Date("2026-01-01T00:00:00.000Z");
    const now = new Date("2026-01-01T00:03:00.000Z");

    const rows = [
      {
        durationMinutes: 2,
        content: { startTime: epoch },
      },
    ];

    const res = pickActiveScheduledContent({
      now,
      rows,
      defaultRotationMinutes: 5,
    });
    expect(res?.row).toBe(rows[0]);
    expect(res?.effectiveMinutes).toBe(2);
  });

  it("rotates across multiple items with different durations", () => {
    const t0 = new Date("2026-01-01T00:00:00.000Z");
    const a = { durationMinutes: 2, content: { startTime: t0 } };
    const b = { durationMinutes: 3, content: { startTime: t0 } };

    // Cycle = 5 minutes
    // [0,2) => a, [2,5) => b
    const res1 = pickActiveScheduledContent({
      now: new Date("2026-01-01T00:01:00.000Z"),
      rows: [a, b],
      defaultRotationMinutes: 5,
    });
    expect(res1?.row).toBe(a);

    const res2 = pickActiveScheduledContent({
      now: new Date("2026-01-01T00:02:00.000Z"),
      rows: [a, b],
      defaultRotationMinutes: 5,
    });
    expect(res2?.row).toBe(b);

    const res3 = pickActiveScheduledContent({
      now: new Date("2026-01-01T00:06:00.000Z"),
      rows: [a, b],
      defaultRotationMinutes: 5,
    });
    // 6 mod 5 = 1 => a
    expect(res3?.row).toBe(a);
  });

  it("uses default duration when durationMinutes is null", () => {
    const t0 = new Date("2026-01-01T00:00:00.000Z");
    const a = {
      durationMinutes: null as number | null,
      content: { startTime: t0 },
    };
    const b = {
      durationMinutes: null as number | null,
      content: { startTime: t0 },
    };

    const res = pickActiveScheduledContent({
      now: new Date("2026-01-01T00:06:00.000Z"),
      rows: [a, b],
      defaultRotationMinutes: 5,
    });
    // Cycle = 10, 6 => in second slot
    expect(res?.row).toBe(b);
    expect(res?.effectiveMinutes).toBe(5);
  });
});
