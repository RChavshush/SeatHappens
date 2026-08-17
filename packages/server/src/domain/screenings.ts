import type { Screening } from "@cinema/shared";
import { prisma } from "../db.js";

export const listScreenings = async (): Promise<Screening[]> => {
  const rows = await prisma.screening.findMany({
    orderBy: { startsAt: "asc" },
    include: { movie: true },
  });
  return rows.map((s) => ({
    id: s.id,
    movieTitle: s.movie.title,
    startsAt: s.startsAt.toISOString(),
  }));
};
