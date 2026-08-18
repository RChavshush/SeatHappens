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
let owner: TestUser;
let stranger: TestUser;

const book = async (cookie: string, seatIds: string[]): Promise<string> => {
  const hold = await request(app)
    .post(`/screenings/${SEED_SCREENING_ID}/holds`)
    .set("Cookie", cookie)
    .send({ seatIds });
  expect(hold.status).toBe(201);
  const confirm = await request(app).post(`/holds/${hold.body.id}/confirm`).set("Cookie", cookie);
  expect(confirm.status).toBe(200);
  return confirm.body.id as string;
};

const seatStatuses = async (cookie: string, seatIds: string[]): Promise<string[]> => {
  const res = await request(app)
    .get(`/screenings/${SEED_SCREENING_ID}/seatmap`)
    .set("Cookie", cookie);
  const seats: { id: string; status: string }[] = res.body.rows.flatMap(
    (r: { seats: unknown[] }) => r.seats,
  );
  return seats.filter((s) => seatIds.includes(s.id)).map((s) => s.status);
};

beforeAll(async () => {
  await resetScreeningState(SEED_SCREENING_ID);
  owner = await registerUser(app, "resv-owner");
  stranger = await registerUser(app, "resv-stranger");
});

afterAll(async () => {
  await resetScreeningState(SEED_SCREENING_ID);
  await deleteUsers([owner.email, stranger.email]);
  await prisma.$disconnect();
});

describe("DELETE /reservations/:id", () => {
  it("cancels the owner's reservation and frees the seats", async () => {
    const seatIds = (await seatIdsForRow("E")).slice(0, 2);
    const reservationId = await book(owner.cookie, seatIds);
    expect(await seatStatuses(owner.cookie, seatIds)).toEqual(["booked", "booked"]);

    const res = await request(app)
      .delete(`/reservations/${reservationId}`)
      .set("Cookie", owner.cookie);
    expect(res.status).toBe(204);

    expect(await seatStatuses(owner.cookie, seatIds)).toEqual(["available", "available"]);

    const hold = await prisma.reservation.findUnique({ where: { id: reservationId } });
    expect(hold).toBeNull();
  });

  it("rejects cancelling someone else's reservation with 404", async () => {
    const seatIds = (await seatIdsForRow("F")).slice(0, 2);
    const reservationId = await book(owner.cookie, seatIds);

    const res = await request(app)
      .delete(`/reservations/${reservationId}`)
      .set("Cookie", stranger.cookie);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("RESERVATION_NOT_FOUND");

    expect(await seatStatuses(owner.cookie, seatIds)).toEqual(["booked", "booked"]);
  });
});
