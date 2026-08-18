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

describe("createHold — multi-row selection", () => {
  it("holds consecutive seats spanning two rows in one request", async () => {
    const rowB = await seatIdsForRow("B");
    const rowC = await seatIdsForRow("C");
    const res = await postHold(userA, [rowB[0]!, rowB[1]!, rowC[0]!, rowC[1]!]);
    expect(res.status).toBe(201);
    expect(res.body.seatIds).toHaveLength(4);
    await request(app).delete(`/holds/${res.body.id}`).auth(userA.token, { type: "bearer" });
  });

  it("rejects when one row's run is not consecutive", async () => {
    const rowD = await seatIdsForRow("D");
    const rowE = await seatIdsForRow("E");
    const res = await postHold(userA, [rowD[0]!, rowD[1]!, rowE[0]!, rowE[2]!]);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("NOT_CONSECUTIVE");
  });
});

describe("createHold — connected group across rows", () => {
  it("rejects a seat left disconnected in the next row (image 1)", async () => {
    const k = await seatIdsForRow("K"); // 5 seats
    const l = await seatIdsForRow("L");
    // K2,K3,K4 + L1 -> L1 touches nothing selected
    const res = await postHold(userA, [k[1]!, k[2]!, k[3]!, l[0]!]);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("NOT_CONSECUTIVE");
  });

  it("accepts a run that wraps from row end into the next row (image 2)", async () => {
    const k = await seatIdsForRow("K");
    const l = await seatIdsForRow("L");
    // K2,K3,K4,K5 + L1 -> L1 connects to K5 via the wrap
    const res = await postHold(userA, [k[1]!, k[2]!, k[3]!, k[4]!, l[0]!]);
    expect(res.status).toBe(201);
    await request(app).delete(`/holds/${res.body.id}`).auth(userA.token, { type: "bearer" });
  });
});

describe("createHold — no seat-count cap", () => {
  it("accepts a connected group of more than 10 seats", async () => {
    const g = await seatIdsForRow("G"); // full 10-seat row
    const h = await seatIdsForRow("H");
    // G1..G10 + H1 (H1 connects to G10 via the wrap) = 11 seats
    const res = await postHold(userA, [...g, h[0]!]);
    expect(res.status).toBe(201);
    expect(res.body.seatIds).toHaveLength(11);
    await request(app).delete(`/holds/${res.body.id}`).auth(userA.token, { type: "bearer" });
  });
});
