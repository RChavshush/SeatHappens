import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../db.js";
import { buildApp } from "../http/app.js";

const app = buildApp();
const email = `auth-test-${Date.now()}@cinema.test`;
const password = "password123";

const cookieFrom = (res: request.Response): string => {
  const setCookie = res.headers["set-cookie"];
  return Array.isArray(setCookie) ? setCookie[0]! : "";
};

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

describe("auth", () => {
  it("registers a user, sets an httpOnly cookie, and omits the token from the body", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email, password, displayName: "Auth Test" });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email, displayName: "Auth Test" });
    expect(res.body.token).toBeUndefined();
    expect(cookieFrom(res)).toMatch(/token=.+/);
    expect(cookieFrom(res).toLowerCase()).toContain("httponly");
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

  it("logs in and sets a cookie", async () => {
    const res = await request(app).post("/auth/login").send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeUndefined();
    expect(cookieFrom(res)).toMatch(/token=.+/);
  });

  it("rejects wrong password with 401", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email, password: "wrong-password" });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_CREDENTIALS");
  });

  it("guards protected routes without a cookie", async () => {
    const res = await request(app).get("/screenings");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHENTICATED");
  });

  it("allows a protected route with the session cookie", async () => {
    const agent = request.agent(app);
    await agent.post("/auth/login").send({ email, password });
    const res = await agent.get("/screenings");
    expect(res.status).toBe(200);
  });

  it("logout clears the cookie", async () => {
    const res = await request(app).post("/auth/logout");
    expect(res.status).toBe(204);
    expect(cookieFrom(res).toLowerCase()).toMatch(/token=;|token=;\s|expires=/i);
  });
});
