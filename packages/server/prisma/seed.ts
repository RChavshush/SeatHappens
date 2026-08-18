import { CINEMA_LAYOUT, buildSeatLayout } from "@cinema/shared";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

const SEED_USERS = [
  { email: "ada@cinema.test", displayName: "Ada", password: "password123" },
  { email: "grace@cinema.test", displayName: "Grace", password: "password123" },
  { email: "alan@cinema.test", displayName: "Alan", password: "password123" },
];

const main = async () => {
  const seats = buildSeatLayout(CINEMA_LAYOUT);

  await prisma.$transaction(async (tx) => {
    for (const user of SEED_USERS) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      await tx.user.upsert({
        where: { email: user.email },
        update: {},
        create: {
          email: user.email,
          displayName: user.displayName,
          passwordHash,
        },
      });
    }

    const seatCount = await tx.seat.count();
    if (seatCount === 0) {
      await tx.seat.createMany({ data: seats });
    }

    const movie = await tx.movie.upsert({
      where: { id: "seed-movie" },
      update: {},
      create: {
        id: "seed-movie",
        title: "The Grand Premiere",
        durationMinutes: 128,
        imageUrl:
          "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&q=80",
      },
    });

    const matinee = await tx.movie.upsert({
      where: { id: "seed-movie-matinee" },
      update: {},
      create: {
        id: "seed-movie-matinee",
        title: "Midnight in the Reel",
        durationMinutes: 95,
        imageUrl:
          "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80",
      },
    });

    const SEED_SCREENINGS = [
      { id: "seed-screening", movieId: movie.id, startsAt: new Date("2026-09-01T19:30:00.000Z") },
      { id: "seed-screening-2", movieId: matinee.id, startsAt: new Date("2026-09-01T22:15:00.000Z") },
      { id: "seed-screening-3", movieId: movie.id, startsAt: new Date("2026-09-02T19:30:00.000Z") },
    ];

    for (const screening of SEED_SCREENINGS) {
      await tx.screening.upsert({
        where: { startsAt: screening.startsAt },
        update: {},
        create: screening,
      });
    }
  });

  const seatCount = await prisma.seat.count();
  console.log(`Seeded ${seatCount} seats, ${SEED_USERS.length} users, 3 screenings.`);
};

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
