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
let viewer: TestUser;
let other: TestUser;

const seatsOf = (body: { rows: { seats: SeatBody[] }[] }): SeatBody[] =>
  body.rows.flatMap((r) => r.seats);

interface SeatBody {
  id: string;
  status: string;
  heldByMe: boolean;
  bookedByMe: boolean;
}

beforeAll(async () => {
  await resetScreeningState(SEED_SCREENING_ID);
  viewer = await registerUser(app, "seatmap");
  other = await registerUser(app, "seatmap-other");
});

afterAll(async () => {
  await resetScreeningState(SEED_SCREENING_ID);
  await deleteUsers([viewer.email, other.email]);
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

  it("marks a seat bookedByMe only for the user who booked it", async () => {
    const seatIds = (await seatIdsForRow("C")).slice(0, 2);
    const hold = await request(app)
      .post(`/screenings/${SEED_SCREENING_ID}/holds`)
      .set("Cookie", viewer.cookie)
      .send({ seatIds });
    expect(hold.status).toBe(201);
    const confirm = await request(app)
      .post(`/holds/${hold.body.id}/confirm`)
      .set("Cookie", viewer.cookie);
    expect(confirm.status).toBe(200);

    const owner = await request(app)
      .get(`/screenings/${SEED_SCREENING_ID}/seatmap`)
      .set("Cookie", viewer.cookie);
    const ownerSeats = seatsOf(owner.body).filter((s) => seatIds.includes(s.id));
    expect(ownerSeats).toHaveLength(2);
    expect(ownerSeats.every((s) => s.status === "booked" && s.bookedByMe)).toBe(true);

    const stranger = await request(app)
      .get(`/screenings/${SEED_SCREENING_ID}/seatmap`)
      .set("Cookie", other.cookie);
    const strangerSeats = seatsOf(stranger.body).filter((s) => seatIds.includes(s.id));
    expect(strangerSeats.every((s) => s.status === "booked" && !s.bookedByMe)).toBe(true);
  });
});
