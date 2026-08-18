import { z } from "zod";
import { createMovieRequestSchema, movieSchema } from "@cinema/shared";
import type { CreateMovieRequest, Movie } from "@cinema/shared";
import { apiFetch } from "./client";

export const listMovies = async (): Promise<Movie[]> =>
  z.array(movieSchema).parse(await apiFetch<unknown>("/movies"));

export const createMovie = async (input: CreateMovieRequest): Promise<Movie> => {
  const body = createMovieRequestSchema.parse(input);
  return movieSchema.parse(
    await apiFetch<unknown>("/movies", { method: "POST", body: JSON.stringify(body) }),
  );
};
