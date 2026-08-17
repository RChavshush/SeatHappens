import type { NextFunction, Request, Response } from "express";
import createError from "http-errors";
import type { ZodTypeAny } from "zod";
import type { RequestPart } from "../../types.js";

export const validate =
  (schema: ZodTypeAny, part: RequestPart = "body") =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      next(
        createError(422, "Request validation failed", {
          code: "VALIDATION_FAILED",
          details: result.error.flatten(),
        }),
      );
      return;
    }
    (req as unknown as Record<RequestPart, unknown>)[part] = result.data;
    next();
  };
