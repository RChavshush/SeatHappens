import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { HOLD_STATUS } from "@cinema/shared";
import { prisma } from "./db.js";
import { buildApp } from "./http/app.js";
import {
  SEED_SCREENING_ID,
  deleteUsers,
  registerUser,
  resetScreeningState,
  seatIdsForRow,
} from "./testing/support.js";
import type { TestUser } from "./testing/support.js";

const app = buildApp();
const emails: string[] = [];

const register = async (label: string): Promise<TestUser> => {
  const user = await registerUser(app, label);
  emails.push(user.email);
  return user;
};

const postHold = (user: TestUser, seatIds: string[]) =>
  request(app)
    .post(`/screenings/${SEED_SCREENING_ID}/holds`)
    .set("Cookie", user.cookie)
    .send({ seatIds });

const confirm = (user: TestUser, holdId: string) =>
  request(app).post(`/holds/${holdId}/confirm`).set("Cookie", user.cookie);

beforeEach(async () => {
  await resetScreeningState(SEED_SCREENING_ID);
});

afterAll(async () => {
  await resetScreeningState(SEED_SCREENING_ID);
  await deleteUsers(emails);
  await prisma.$disconnect();
});

describe("concurrency", () => {
  it("10 parallel holds on the same seat: exactly one wins", async () => {
    const users = await Promise.all(
      Array.from({ length: 10 }, (_, i) => register(`race-${i}`)),
    );
    const seat = (await seatIdsForRow("G"))[0]!;

    const results = await Promise.all(users.map((u) => postHold(u, [seat])));
    const statuses = results.map((r) => r.status);
    const wins = statuses.filter((s) => s === 201).length;
    const losses = statuses.filter((s) => s !== 201);

    expect(wins).toBe(1);
    expect(losses).toHaveLength(9);
    expect(losses.every((s) => s === 409)).toBe(true);
  });

  it("an expired hold releases its seat to the next requester", async () => {
    const userA = await register("expire-a");
    const userB = await register("expire-b");
    const seat = (await seatIdsForRow("H"))[0]!;

    const held = await postHold(userA, [seat]);
    expect(held.status).toBe(201);

    const past = new Date(Date.now() - 60_000);
    await prisma.seatHold.update({ where: { id: held.body.id }, data: { expiresAt: past } });
    await prisma.seatLock.updateMany({ where: { holdId: held.body.id }, data: { expiresAt: past } });

    const next = await postHold(userB, [seat]);
    expect(next.status).toBe(201);
  });

  it("confirming an expired hold fails with 410 while the seat stays free", async () => {
    const user = await register("expire-confirm");
    const seat = (await seatIdsForRow("J"))[0]!;
    const held = await postHold(user, [seat]);

    await prisma.seatHold.update({
      where: { id: held.body.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const res = await confirm(user, held.body.id);
    expect(res.status).toBe(410);
    const reservations = await prisma.reservation.count({ where: { screeningId: SEED_SCREENING_ID } });
    expect(reservations).toBe(0);
  });

  it("two parallel confirms on the same seat produce exactly one reservation", async () => {
    const userA = await register("confirm-race-a");
    const userB = await register("confirm-race-b");
    const seat = (await seatIdsForRow("K"))[0]!;
    const expiresAt = new Date(Date.now() + 600_000);

    const makeHold = async (userId: string): Promise<string> => {
      const hold = await prisma.seatHold.create({
        data: { screeningId: SEED_SCREENING_ID, userId, status: HOLD_STATUS.active, expiresAt },
      });
      await prisma.seatHoldSeat.create({
        data: { holdId: hold.id, seatId: seat, screeningId: SEED_SCREENING_ID },
      });
      return hold.id;
    };

    const holdA = await makeHold(userA.userId);
    const holdB = await makeHold(userB.userId);

    const results = await Promise.all([confirm(userA, holdA), confirm(userB, holdB)]);
    const statuses = results.map((r) => r.status);

    expect(statuses.filter((s) => s === 200)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(1);
    const reservations = await prisma.reservationSeat.count({
      where: { screeningId: SEED_SCREENING_ID, seatId: seat },
    });
    expect(reservations).toBe(1);
  });
});
