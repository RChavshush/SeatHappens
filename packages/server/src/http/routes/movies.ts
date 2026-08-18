import { Router } from "express";
import { createMovieRequestSchema } from "@cinema/shared";
import { createMovie, listMovies } from "../../domain/movies.js";
import { asyncHandler } from "../async-handler.js";
import { validate } from "../middleware/validate.js";

export const moviesRouter = Router();

moviesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await listMovies());
  }),
);

moviesRouter.post(
  "/",
  validate(createMovieRequestSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await createMovie(req.body));
  }),
);
