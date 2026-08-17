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
let userA: TestUser;
let userB: TestUser;
let rowA: string[];

const postHold = (user: TestUser, seatIds: string[]) =>
  request(app)
    .post(`/screenings/${SEED_SCREENING_ID}/holds`)
    .auth(user.token, { type: "bearer" })
    .send({ seatIds });

const seatmap = (user: TestUser) =>
  request(app).get(`/screenings/${SEED_SCREENING_ID}/seatmap`).auth(user.token, { type: "bearer" });

const seatById = async (user: TestUser, id: string) => {
  const res = await seatmap(user);
  return res.body.rows
    .flatMap((r: { seats: { id: string }[] }) => r.seats)
    .find((s: { id: string }) => s.id === id);
};

beforeAll(async () => {
  await resetScreeningState(SEED_SCREENING_ID);
  userA = await registerUser(app, "hold-a");
  userB = await registerUser(app, "hold-b");
  rowA = await seatIdsForRow("A");
});

afterAll(async () => {
  await resetScreeningState(SEED_SCREENING_ID);
  await deleteUsers([userA.email, userB.email]);
  await prisma.$disconnect();
});

describe("create hold", () => {
  it("holds three consecutive seats", async () => {
    const res = await postHold(userA, [rowA[0]!, rowA[1]!, rowA[2]!]);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("active");
    expect(res.body.seatIds).toHaveLength(3);
    expect(res.body.expiresAt).toBeTypeOf("string");

    const seat = await seatById(userA, rowA[0]!);
    expect(seat).toMatchObject({ status: "held", heldByMe: true });
  });

  it("replaces the user's own active hold and releases its seats", async () => {
    const res = await postHold(userA, [rowA[4]!, rowA[5]!]);
    expect(res.status).toBe(201);

    expect(await seatById(userA, rowA[0]!)).toMatchObject({ status: "available" });
    expect(await seatById(userA, rowA[4]!)).toMatchObject({ status: "held", heldByMe: true });
  });

  it("rejects a non-consecutive selection and keeps the existing hold", async () => {
    const res = await postHold(userA, [rowA[0]!, rowA[2]!]);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("NOT_CONSECUTIVE");

    expect(await seatById(userA, rowA[4]!)).toMatchObject({ status: "held", heldByMe: true });
  });

  it("rejects a selection that traps a single empty seat", async () => {
    const held = await postHold(userB, [rowA[0]!]);
    expect(held.status).toBe(201);

    const res = await postHold(userA, [rowA[2]!]);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("ISOLATED_SEAT");
  });

  it("rejects seats another user already holds", async () => {
    const res = await postHold(userA, [rowA[0]!]);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("SEAT_UNAVAILABLE");
  });
});
