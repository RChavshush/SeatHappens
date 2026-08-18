import type { NextFunction, Request, Response } from "express";
import createError from "http-errors";
import { ERROR_CODE } from "@cinema/shared";
import { verifyToken } from "./jwt.js";

export const authGuard = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(
      createError(401, "Missing or malformed Authorization header", {
        code: ERROR_CODE.UNAUTHENTICATED,
      }),
    );
    return;
  }

  try {
    const payload = verifyToken(header.slice("Bearer ".length));
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(createError(401, "Invalid or expired token", { code: ERROR_CODE.UNAUTHENTICATED }));
  }
};
