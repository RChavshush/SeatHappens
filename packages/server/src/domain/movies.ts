import type { CreateMovieRequest, Movie } from "@cinema/shared";
import { prisma } from "../db.js";
import type { Movie as DbMovie } from "../generated/prisma/index.js";

const toMovie = (m: DbMovie): Movie => ({
  id: m.id,
  title: m.title,
  durationMinutes: m.durationMinutes,
  imageUrl: m.imageUrl,
});

export const listMovies = async (): Promise<Movie[]> => {
  const rows = await prisma.movie.findMany({ orderBy: { title: "asc" } });
  return rows.map(toMovie);
};

export const createMovie = async (input: CreateMovieRequest): Promise<Movie> => {
  const created = await prisma.movie.create({
    data: {
      title: input.title,
      durationMinutes: input.durationMinutes,
      imageUrl: input.imageUrl ?? null,
    },
  });
  return toMovie(created);
};
