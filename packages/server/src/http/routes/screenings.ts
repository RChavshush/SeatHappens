import { Router } from "express";
import { buildSeatMap } from "../../domain/seatmap.js";
import { listScreenings } from "../../domain/screenings.js";
import { asyncHandler } from "../async-handler.js";
import { validate } from "../middleware/validate.js";
import { idParamsSchema } from "../params.js";

export const screeningsRouter = Router();

screeningsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await listScreenings());
  }),
);

screeningsRouter.get(
  "/:id/seatmap",
  validate(idParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    res.json(await buildSeatMap(req.params.id!, req.user!));
  }),
);
