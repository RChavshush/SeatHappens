import { Router } from "express";
import { loginRequestSchema, registerRequestSchema } from "@cinema/shared";
import { asyncHandler } from "../http/async-handler.js";
import { validate } from "../http/middleware/validate.js";
import { clearAuthCookie, setAuthCookie } from "./cookie.js";
import { login, register } from "./service.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  validate(registerRequestSchema),
  asyncHandler(async (req, res) => {
    const { token, user } = await register(req.body);
    setAuthCookie(res, token);
    res.status(201).json({ user });
  }),
);

authRouter.post(
  "/login",
  validate(loginRequestSchema),
  asyncHandler(async (req, res) => {
    const { token, user } = await login(req.body);
    setAuthCookie(res, token);
    res.json({ user });
  }),
);

authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});
