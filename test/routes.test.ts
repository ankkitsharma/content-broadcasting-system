import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

// Provide env vars before importing the app (env.ts parses process.env at import time).
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.JWT_SECRET ??= "0123456789abcdef0123456789abcdef";
process.env.UPLOAD_DIR ??= "uploads";
process.env.DEFAULT_ROTATION_MINUTES ??= "5";

vi.mock("bcryptjs", () => {
  const compare = vi.fn();
  return { default: { compare }, compare };
});

vi.mock("../src/db/prisma", () => {
  const prisma = {
    $transaction: vi.fn(async (fn: any) => fn(prisma.prisma)),
    prisma: {
      user: { findUnique: vi.fn() },
      content: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn()
      },
      contentSchedule: {
        findMany: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn()
      }
    }
  };

  return prisma;
});

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "../src/db/prisma";
import { createApp } from "../src/app";

describe("routes (mocked prisma)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /health returns ok", async () => {
    const app = createApp();
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("GET /docs returns swagger ui html", async () => {
    const app = createApp();
    const res = await request(app).get("/docs/"); // swagger-ui-express redirects /docs -> /docs/
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/html/);
    expect(res.text).toMatch(/Swagger UI/i);
  });

  it("POST /auth/login returns token for valid credentials", async () => {
    const app = createApp();

    (prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "u1",
      name: "T",
      email: "teacher1@example.com",
      role: "teacher",
      passwordHash: "fake-hash"
    });

    (bcrypt.compare as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const res = await request(app).post("/auth/login").send({ email: "teacher1@example.com", password: "Teacher@123" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ id: "u1", email: "teacher1@example.com", role: "teacher" });
  });

  it("GET /admin/content requires principal role", async () => {
    const app = createApp();
    const token = jwt.sign({ role: "teacher", email: "teacher1@example.com" }, process.env.JWT_SECRET!, { subject: "u1", expiresIn: "1h" });

    const res = await request(app).get("/admin/content").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("GET /content/live/:teacherId returns empty response when no schedules", async () => {
    const app = createApp();
    (prisma.contentSchedule.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.content.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await request(app).get("/content/live/t1");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
  });

  it("GET /content/live/:teacherId returns empty response for invalid subject filter", async () => {
    const app = createApp();

    // Should not error even though subject is invalid.
    const res1 = await request(app).get("/content/live/t1?subject=");
    expect(res1.status).toBe(200);
    expect(res1.body).toEqual({});

    const res2 = await request(app).get("/content/live/t1?subject=a&subject=b");
    expect(res2.status).toBe(200);
    expect(res2.body).toEqual({});
  });
});

