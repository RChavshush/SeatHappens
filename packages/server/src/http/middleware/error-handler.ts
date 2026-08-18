import type { NextFunction, Request, Response } from "express";
import { isHttpError } from "http-errors";
import { ERROR_CODE } from "@cinema/shared";
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
      code: typeof extra.code === "string" ? extra.code : ERROR_CODE.ERROR,
      message: err.message,
    };
    if (extra.details !== undefined) body.details = extra.details;
    res.status(err.status).json(body);
    return;
  }

  console.error(err);
  const body: ErrorResponse = { code: ERROR_CODE.INTERNAL, message: "Internal server error" };
  res.status(500).json(body);
};
