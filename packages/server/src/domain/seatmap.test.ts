import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../db.js";
import { buildApp } from "../http/app.js";
import { SEED_SCREENING_ID, deleteUsers, registerUser, resetScreeningState } from "../testing/support.js";
import type { TestUser } from "../testing/support.js";

const app = buildApp();
let viewer: TestUser;

beforeAll(async () => {
  await resetScreeningState(SEED_SCREENING_ID);
  viewer = await registerUser(app, "seatmap");
});

afterAll(async () => {
  await deleteUsers([viewer.email]);
  await prisma.$disconnect();
});

describe("seat map", () => {
  it("lists screenings", async () => {
    const res = await request(app).get("/screenings").set("Cookie", viewer.cookie);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty("movieTitle");
  });

  it("returns 13 rows and 115 seats, all available on a clean screening", async () => {
    const res = await request(app)
      .get(`/screenings/${SEED_SCREENING_ID}/seatmap`)
      .set("Cookie", viewer.cookie);

    expect(res.status).toBe(200);
    expect(res.body.rows).toHaveLength(13);
    const seats = res.body.rows.flatMap((r: { seats: unknown[] }) => r.seats);
    expect(seats).toHaveLength(115);
    expect(seats.every((s: { status: string }) => s.status === "available")).toBe(true);
  });

  it("404s an unknown screening", async () => {
    const res = await request(app)
      .get("/screenings/does-not-exist/seatmap")
      .set("Cookie", viewer.cookie);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("SCREENING_NOT_FOUND");
  });
});
