import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../db.js";
import { buildApp } from "../http/app.js";

const app = buildApp();
const email = `auth-test-${Date.now()}@cinema.test`;
const password = "password123";

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

describe("auth", () => {
  it("registers a new user and returns a token", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email, password, displayName: "Auth Test" });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf("string");
    expect(res.body.user).toMatchObject({ email, displayName: "Auth Test" });
  });

  it("rejects a duplicate email with 409", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email, password, displayName: "Dupe" });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("EMAIL_TAKEN");
  });

  it("rejects a malformed body with 422 VALIDATION_FAILED", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "not-an-email", password: "short" });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_FAILED");
  });

  it("logs in with correct credentials", async () => {
    const res = await request(app).post("/auth/login").send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf("string");
  });

  it("rejects wrong password with 401", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email, password: "wrong-password" });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_CREDENTIALS");
  });

  it("guards protected routes without a token", async () => {
    const res = await request(app).get("/screenings");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHENTICATED");
  });
});
