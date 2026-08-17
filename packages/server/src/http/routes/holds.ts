import { Router } from "express";
import { confirmHold, releaseHold } from "../../domain/holds.js";
import { availableDeltas, bookedDeltas, broadcastSeatUpdates } from "../../realtime/emitter.js";
import { asyncHandler } from "../async-handler.js";
import { validate } from "../middleware/validate.js";
import { idParamsSchema } from "../params.js";

export const holdsRouter = Router();

holdsRouter.post(
  "/:id/confirm",
  validate(idParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const result = await confirmHold(req.params.id!, req.user!.id);
    broadcastSeatUpdates(result.screeningId, bookedDeltas(result.bookedSeatIds));
    res.json(result.reservation);
  }),
);

holdsRouter.delete(
  "/:id",
  validate(idParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const result = await releaseHold(req.params.id!, req.user!.id);
    broadcastSeatUpdates(result.screeningId, availableDeltas(result.releasedSeatIds));
    res.status(204).end();
  }),
);
