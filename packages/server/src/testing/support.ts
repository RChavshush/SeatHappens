import request from "supertest";
import type { Express } from "express";
import { prisma } from "../db.js";

export const SEED_SCREENING_ID = "seed-screening";

export interface TestUser {
  cookie: string;
  userId: string;
  email: string;
}

export const registerUser = async (app: Express, label: string): Promise<TestUser> => {
  const email = `it-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@cinema.test`;
  const res = await request(app)
    .post("/auth/register")
    .send({ email, password: "password123", displayName: label });
  if (res.status !== 201) {
    throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const setCookie = res.headers["set-cookie"];
  const cookie = Array.isArray(setCookie) ? setCookie[0]!.split(";")[0]! : "";
  return { cookie, userId: res.body.user.id, email };
};

export const resetScreeningState = async (screeningId: string): Promise<void> => {
  await prisma.reservation.deleteMany({ where: { screeningId } });
  await prisma.seatHold.deleteMany({ where: { screeningId } });
};

export const deleteUsers = async (emails: string[]): Promise<void> => {
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
};

export const seatIdsForRow = async (rowLabel: string): Promise<string[]> => {
  const seats = await prisma.seat.findMany({
    where: { rowLabel },
    orderBy: { seatNumber: "asc" },
    select: { id: true },
  });
  return seats.map((s) => s.id);
};
