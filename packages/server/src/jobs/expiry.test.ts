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
import { runExpirySweep } from "./expiry.js";

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

describe("expiry sweep", () => {
  it("deletes expired locks and marks their holds expired", async () => {
    const user = await registerUser(app, "sweep");
    emails.push(user.email);
    const seat = (await seatIdsForRow("M"))[0]!;

    const held = await request(app)
      .post(`/screenings/${SEED_SCREENING_ID}/holds`)
      .set("Cookie", user.cookie)
      .send({ seatIds: [seat] });
    expect(held.status).toBe(201);

    const past = new Date(Date.now() - 60_000);
    await prisma.seatHold.update({ where: { id: held.body.id }, data: { expiresAt: past } });
    await prisma.seatLock.updateMany({ where: { holdId: held.body.id }, data: { expiresAt: past } });

    await runExpirySweep();

    expect(await prisma.seatLock.count({ where: { holdId: held.body.id } })).toBe(0);
    const hold = await prisma.seatHold.findUnique({ where: { id: held.body.id } });
    expect(hold?.status).toBe("expired");
  });
});
