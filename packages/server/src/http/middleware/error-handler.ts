import type { NextFunction, Request, Response } from "express";
import { isHttpError } from "http-errors";
import type { ErrorResponse } from "@cinema/shared";

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (isHttpError(err)) {
    const extra = err as { code?: unknown; details?: unknown };
    const body: ErrorResponse = {
      code: typeof extra.code === "string" ? extra.code : "ERROR",
      message: err.message,
    };
    if (extra.details !== undefined) body.details = extra.details;
    res.status(err.status).json(body);
    return;
  }

  console.error(err);
  const body: ErrorResponse = { code: "INTERNAL", message: "Internal server error" };
  res.status(500).json(body);
};
