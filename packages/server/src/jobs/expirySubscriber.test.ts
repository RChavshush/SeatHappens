import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../db.js";
import { buildApp } from "../http/app.js";
import {
  SEED_SCREENING_ID,
  deleteUsers,
  registerUser,
  resetScreeningState,
  seatIdsForRow,
} from "../testing/support.js";
import { releaseHoldById } from "./expirySubscriber.js";

const app = buildApp();
const emails: string[] = [];

beforeEach(async () => {
  await resetScreeningState(SEED_SCREENING_ID);
});

afterAll(async () => {
  await resetScreeningState(SEED_SCREENING_ID);
  await deleteUsers(emails);
  await prisma.$disconnect();
});

describe("releaseHoldById", () => {
  it("deletes the hold's locks and marks it expired", async () => {
    const user = await registerUser(app, "release-by-id");
    emails.push(user.email);
    const seat = (await seatIdsForRow("M"))[0]!;

    const held = await request(app)
      .post(`/screenings/${SEED_SCREENING_ID}/holds`)
      .set("Cookie", user.cookie)
      .send({ seatIds: [seat] });
    expect(held.status).toBe(201);

    await releaseHoldById(held.body.id);

    expect(await prisma.seatLock.count({ where: { holdId: held.body.id } })).toBe(0);
    const hold = await prisma.seatHold.findUnique({ where: { id: held.body.id } });
    expect(hold?.status).toBe("expired");
  });

  it("is a no-op for a hold with no locks", async () => {
    const user = await registerUser(app, "release-noop");
    emails.push(user.email);
    const seat = (await seatIdsForRow("M"))[0]!;

    const held = await request(app)
      .post(`/screenings/${SEED_SCREENING_ID}/holds`)
      .set("Cookie", user.cookie)
      .send({ seatIds: [seat] });
    expect(held.status).toBe(201);
    await prisma.seatLock.deleteMany({ where: { holdId: held.body.id } });

    await expect(releaseHoldById(held.body.id)).resolves.toBeUndefined();
  });
});
