import { Router } from "express";
import { cancelReservation } from "../../domain/reservations.js";
import { availableDeltas, broadcastSeatUpdates } from "../../realtime/emitter.js";
import { asyncHandler } from "../async-handler.js";
import { validate } from "../middleware/validate.js";
import { idParamsSchema } from "../params.js";

export const reservationsRouter = Router();

reservationsRouter.delete(
  "/:id",
  validate(idParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const result = await cancelReservation(req.params.id!, req.user!.id);
    broadcastSeatUpdates(result.screeningId, availableDeltas(result.releasedSeatIds));
    res.status(204).end();
  }),
);
