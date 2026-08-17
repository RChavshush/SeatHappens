import { Router } from "express";
import { getCurrentHold, listReservations } from "../../domain/me.js";
import { asyncHandler } from "../async-handler.js";
import { validate } from "../middleware/validate.js";
import { screeningIdQuerySchema } from "../params.js";

export const meRouter = Router();

meRouter.get(
  "/hold",
  validate(screeningIdQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const screeningId = (req.query as { screeningId: string }).screeningId;
    res.json(await getCurrentHold(req.user!.id, screeningId));
  }),
);

meRouter.get(
  "/reservations",
  asyncHandler(async (req, res) => {
    res.json(await listReservations(req.user!.id));
  }),
);
