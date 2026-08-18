import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../db.js";
import { buildApp } from "../http/app.js";
import {
  SEED_SCREENING_ID,
  deleteUsers,
  registerUser,
  resetScreeningState,
  seatIdsForRow,
} from "../testing/support.js";
import type { TestUser } from "../testing/support.js";

const app = buildApp();
let user: TestUser;

const bookRow = async (cookie: string, seatIds: string[]): Promise<void> => {
  const hold = await request(app)
    .post(`/screenings/${SEED_SCREENING_ID}/holds`)
    .set("Cookie", cookie)
    .send({ seatIds });
  expect(hold.status).toBe(201);
  const confirm = await request(app).post(`/holds/${hold.body.id}/confirm`).set("Cookie", cookie);
  expect(confirm.status).toBe(200);
};

beforeAll(async () => {
  await resetScreeningState(SEED_SCREENING_ID);
  user = await registerUser(app, "me-user");
});

afterAll(async () => {
  await resetScreeningState(SEED_SCREENING_ID);
  await deleteUsers([user.email]);
  await prisma.$disconnect();
});

describe("GET /me", () => {
  it("returns the authenticated user for a valid cookie", async () => {
    const res = await request(app).get("/me").set("Cookie", user.cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: user.userId,
      email: user.email,
      displayName: "me-user",
    });
  });

  it("rejects a request without a cookie", async () => {
    const res = await request(app).get("/me");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHENTICATED");
  });
});

describe("GET /me/reservations", () => {
  it("returns enriched summaries with movie title and sorted seat labels", async () => {
    const seatIds = (await seatIdsForRow("D")).slice(0, 3);
    await bookRow(user.cookie, seatIds);

    const res = await request(app).get("/me/reservations").set("Cookie", user.cookie);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const summary = res.body[0];
    expect(summary).toHaveProperty("movieTitle");
    expect(typeof summary.movieTitle).toBe("string");
    expect(summary).toHaveProperty("startsAt");
    expect(summary.seatLabels).toEqual(["D1", "D2", "D3"]);
    expect(summary.referenceCode).toMatch(/^RSV-/);
  });
});
