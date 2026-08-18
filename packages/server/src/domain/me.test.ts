import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../db.js";
import { buildApp } from "../http/app.js";
import { deleteUsers, registerUser } from "../testing/support.js";
import type { TestUser } from "../testing/support.js";

const app = buildApp();
let user: TestUser;

beforeAll(async () => {
  user = await registerUser(app, "me-user");
});

afterAll(async () => {
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
