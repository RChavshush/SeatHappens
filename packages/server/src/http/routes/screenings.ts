import { Router } from "express";
import { createHoldRequestSchema } from "@cinema/shared";
import { createHold } from "../../domain/holds.js";
import { buildSeatMap } from "../../domain/seatmap.js";
import { listScreenings } from "../../domain/screenings.js";
import { availableDeltas, broadcastSeatUpdates, heldDeltas } from "../../realtime/emitter.js";
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

screeningsRouter.post(
  "/:id/holds",
  validate(idParamsSchema, "params"),
  validate(createHoldRequestSchema),
  asyncHandler(async (req, res) => {
    const result = await createHold(req.params.id!, req.user!.id, req.body.seatIds);
    broadcastSeatUpdates(req.params.id!, [
      ...heldDeltas(result.heldSeatIds, result.hold.expiresAt),
      ...availableDeltas(result.releasedSeatIds),
    ]);
    res.status(201).json(result.hold);
  }),
);
