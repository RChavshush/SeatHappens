import request from "supertest";
import { afterAll, beforeEach, afterEach, describe, expect, it } from "vitest";
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
const emails: string[] = [];

const postHold = (user: TestUser, seatIds: string[]) =>
  request(app)
    .post(`/screenings/${SEED_SCREENING_ID}/holds`)
    .auth(user.token, { type: "bearer" })
    .send({ seatIds });

const register = async (label: string): Promise<TestUser> => {
  const user = await registerUser(app, label);
  emails.push(user.email);
  return user;
};

beforeEach(async () => {
  await resetScreeningState(SEED_SCREENING_ID);
});

afterEach(async () => {
  await resetScreeningState(SEED_SCREENING_ID);
});

afterAll(async () => {
  await deleteUsers(emails);
  await prisma.$disconnect();
});

describe("confirm and release", () => {
  it("confirms a hold, books the seats and lists the reservation", async () => {
    const user = await register("confirm");
    const rowB = await seatIdsForRow("B");
    const held = await postHold(user, [rowB[0]!, rowB[1]!]);
    const holdId = held.body.id;

    const res = await request(app)
      .post(`/holds/${holdId}/confirm`)
      .auth(user.token, { type: "bearer" });
    expect(res.status).toBe(200);
    expect(res.body.referenceCode).toMatch(/^RSV-/);
    expect(res.body.seatIds).toHaveLength(2);

    const list = await request(app)
      .get("/me/reservations")
      .auth(user.token, { type: "bearer" });
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(res.body.id);

    const map = await request(app)
      .get(`/screenings/${SEED_SCREENING_ID}/seatmap`)
      .auth(user.token, { type: "bearer" });
    const seat = map.body.rows
      .flatMap((r: { seats: { id: string; status: string }[] }) => r.seats)
      .find((s: { id: string }) => s.id === rowB[0]!);
    expect(seat.status).toBe("booked");
  });

  it("is idempotent: a second confirm returns the same reservation", async () => {
    const user = await register("confirm-idem");
    const rowC = await seatIdsForRow("C");
    const held = await postHold(user, [rowC[0]!]);
    const holdId = held.body.id;

    const first = await request(app).post(`/holds/${holdId}/confirm`).auth(user.token, { type: "bearer" });
    const second = await request(app).post(`/holds/${holdId}/confirm`).auth(user.token, { type: "bearer" });
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
  });

  it("returns the active hold from /me/hold, and null after confirm", async () => {
    const user = await register("me-hold");
    const rowD = await seatIdsForRow("D");
    const held = await postHold(user, [rowD[0]!]);

    const before = await request(app)
      .get(`/me/hold?screeningId=${SEED_SCREENING_ID}`)
      .auth(user.token, { type: "bearer" });
    expect(before.body.id).toBe(held.body.id);

    await request(app).post(`/holds/${held.body.id}/confirm`).auth(user.token, { type: "bearer" });

    const after = await request(app)
      .get(`/me/hold?screeningId=${SEED_SCREENING_ID}`)
      .auth(user.token, { type: "bearer" });
    expect(after.body).toBeNull();
  });

  it("releases a hold and frees its seats", async () => {
    const user = await register("release");
    const rowE = await seatIdsForRow("E");
    const held = await postHold(user, [rowE[0]!, rowE[1]!]);

    const res = await request(app).delete(`/holds/${held.body.id}`).auth(user.token, { type: "bearer" });
    expect(res.status).toBe(204);

    const hold = await request(app)
      .get(`/me/hold?screeningId=${SEED_SCREENING_ID}`)
      .auth(user.token, { type: "bearer" });
    expect(hold.body).toBeNull();
  });

  it("rejects confirming an expired hold with 410", async () => {
    const user = await register("expired");
    const rowF = await seatIdsForRow("F");
    const held = await postHold(user, [rowF[0]!]);

    await prisma.seatHold.update({
      where: { id: held.body.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const res = await request(app).post(`/holds/${held.body.id}/confirm`).auth(user.token, { type: "bearer" });
    expect(res.status).toBe(410);
    expect(res.body.code).toBe("HOLD_EXPIRED");
  });

  it("404s releasing an unknown hold", async () => {
    const user = await register("release-404");
    const res = await request(app).delete("/holds/nope").auth(user.token, { type: "bearer" });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("HOLD_NOT_FOUND");
  });
});
