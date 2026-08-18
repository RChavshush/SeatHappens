import createError from "http-errors";
import { ERROR_CODE } from "@cinema/shared";
import type { CreateScreeningRequest, Screening } from "@cinema/shared";
import { prisma } from "../db.js";
import { isUniqueViolation } from "../db-tx.js";
import type { Screening as DbScreening, Movie as DbMovie } from "../generated/prisma/index.js";

const toScreening = (s: DbScreening & { movie: DbMovie }): Screening => ({
  id: s.id,
  movieId: s.movieId,
  movieTitle: s.movie.title,
  movieImageUrl: s.movie.imageUrl,
  startsAt: s.startsAt.toISOString(),
  durationMinutes: s.movie.durationMinutes,
  endsAt: new Date(s.startsAt.getTime() + s.movie.durationMinutes * 60_000).toISOString(),
});

export const listScreenings = async (): Promise<Screening[]> => {
  const rows = await prisma.screening.findMany({
    orderBy: { startsAt: "asc" },
    include: { movie: true },
  });
  return rows.map(toScreening);
};

export const createScreening = async (input: CreateScreeningRequest): Promise<Screening> => {
  const movie = await prisma.movie.findUnique({ where: { id: input.movieId } });
  if (!movie) {
    throw createError(404, "Movie not found", { code: ERROR_CODE.SCREENING_NOT_FOUND });
  }

  try {
    const created = await prisma.screening.create({
      data: { movieId: input.movieId, startsAt: new Date(input.startsAt) },
      include: { movie: true },
    });
    return toScreening(created);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw createError(409, "A screening already starts at that time", {
        code: ERROR_CODE.SCREENING_TIME_TAKEN,
      });
    }
    throw error;
  }
};
