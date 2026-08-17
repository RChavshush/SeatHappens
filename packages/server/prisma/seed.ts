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

    await tx.seat.deleteMany();
    await tx.seat.createMany({ data: seats });

    const movie = await tx.movie.upsert({
      where: { id: "seed-movie" },
      update: {},
      create: {
        id: "seed-movie",
        title: "The Grand Premiere",
        durationMinutes: 128,
      },
    });

    const startsAt = new Date("2026-09-01T19:30:00.000Z");
    await tx.screening.upsert({
      where: { startsAt },
      update: {},
      create: { id: "seed-screening", movieId: movie.id, startsAt },
    });
  });

  const seatCount = await prisma.seat.count();
  console.log(`Seeded ${seatCount} seats, ${SEED_USERS.length} users, 1 screening.`);
};

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
