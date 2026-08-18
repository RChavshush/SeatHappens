import type { NextFunction, Request, Response } from "express";
import createError from "http-errors";
import { ERROR_CODE } from "@cinema/shared";
import { AUTH_COOKIE_NAME } from "./cookie.js";
import { verifyToken } from "./jwt.js";

export const authGuard = (req: Request, _res: Response, next: NextFunction): void => {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof token !== "string" || token.length === 0) {
    next(
      createError(401, "Missing authentication cookie", {
        code: ERROR_CODE.UNAUTHENTICATED,
      }),
    );
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(createError(401, "Invalid or expired token", { code: ERROR_CODE.UNAUTHENTICATED }));
  }
};
