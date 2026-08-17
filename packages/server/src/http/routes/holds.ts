import { Router } from "express";
import { confirmHold, releaseHold } from "../../domain/holds.js";
import { asyncHandler } from "../async-handler.js";
import { validate } from "../middleware/validate.js";
import { idParamsSchema } from "../params.js";

export const holdsRouter = Router();

holdsRouter.post(
  "/:id/confirm",
  validate(idParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const result = await confirmHold(req.params.id!, req.user!.id);
    res.json(result.reservation);
  }),
);

holdsRouter.delete(
  "/:id",
  validate(idParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    await releaseHold(req.params.id!, req.user!.id);
    res.status(204).end();
  }),
);
