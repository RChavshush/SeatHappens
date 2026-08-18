import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../db.js";
import { buildApp } from "../http/app.js";

const app = buildApp();
const email = `admin-test-${Date.now()}@cinema.test`;
const password = "password123";

beforeAll(async () => {
  await request(app).post("/auth/register").send({ email, password, displayName: "Admin Test" });
});

const login = async () => {
  const agent = request.agent(app);
  await agent.post("/auth/login").send({ email, password });
  return agent;
};

const createdMovieIds: string[] = [];
const createdScreeningStarts: string[] = [];

afterAll(async () => {
  await prisma.screening.deleteMany({ where: { startsAt: { in: createdScreeningStarts.map((s) => new Date(s)) } } });
  await prisma.movie.deleteMany({ where: { id: { in: createdMovieIds } } });
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

describe("movies + screenings admin", () => {
  it("creates a movie with an image URL", async () => {
    const agent = await login();
    const res = await agent.post("/movies").send({
      title: `Test Reel ${Date.now()}`,
      durationMinutes: 97,
      imageUrl: "https://example.com/poster.jpg",
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ durationMinutes: 97, imageUrl: "https://example.com/poster.jpg" });
    createdMovieIds.push(res.body.id);
  });

  it("rejects a malformed movie with 422", async () => {
    const agent = await login();
    const res = await agent.post("/movies").send({ title: "", durationMinutes: -3 });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_FAILED");
  });

  it("creates a screening and exposes movie + computed endsAt", async () => {
    const agent = await login();
    const movie = await agent
      .post("/movies")
      .send({ title: `Screened ${Date.now()}`, durationMinutes: 120 });
    createdMovieIds.push(movie.body.id);

    const startsAt = new Date(Date.now() + 86_400_000).toISOString();
    createdScreeningStarts.push(startsAt);
    const res = await agent.post("/screenings").send({ movieId: movie.body.id, startsAt });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      movieId: movie.body.id,
      movieTitle: movie.body.title,
      durationMinutes: 120,
      startsAt,
    });
    expect(new Date(res.body.endsAt).getTime() - new Date(startsAt).getTime()).toBe(120 * 60_000);
  });

  it("rejects a duplicate start time with SCREENING_TIME_TAKEN", async () => {
    const agent = await login();
    const movie = await agent
      .post("/movies")
      .send({ title: `Dupe ${Date.now()}`, durationMinutes: 90 });
    createdMovieIds.push(movie.body.id);

    const startsAt = new Date(Date.now() + 172_800_000 + Math.floor(Math.random() * 1000) * 1000).toISOString();
    createdScreeningStarts.push(startsAt);
    const first = await agent.post("/screenings").send({ movieId: movie.body.id, startsAt });
    expect(first.status).toBe(201);

    const second = await agent.post("/screenings").send({ movieId: movie.body.id, startsAt });
    expect(second.status).toBe(409);
    expect(second.body.code).toBe("SCREENING_TIME_TAKEN");
  });

  it("rejects a screening for an unknown movie with SCREENING_NOT_FOUND", async () => {
    const agent = await login();
    const res = await agent
      .post("/screenings")
      .send({ movieId: "does-not-exist", startsAt: new Date(Date.now() + 999_000_000).toISOString() });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("SCREENING_NOT_FOUND");
  });
});
