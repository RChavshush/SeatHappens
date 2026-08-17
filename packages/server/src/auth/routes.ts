import { Router } from "express";
import { loginRequestSchema, registerRequestSchema } from "@cinema/shared";
import { asyncHandler } from "../http/async-handler.js";
import { validate } from "../http/middleware/validate.js";
import { login, register } from "./service.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  validate(registerRequestSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await register(req.body));
  }),
);

authRouter.post(
  "/login",
  validate(loginRequestSchema),
  asyncHandler(async (req, res) => {
    res.json(await login(req.body));
  }),
);
