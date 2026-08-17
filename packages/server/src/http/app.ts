import cors from "cors";
import express, { type Express } from "express";
import { authGuard } from "../auth/guard.js";
import { authRouter } from "../auth/routes.js";
import { env } from "../env.js";
import { errorHandler } from "./middleware/error-handler.js";

export const buildApp = (): Express => {
  const app = express();

  app.use(cors({ origin: env.CLIENT_ORIGIN }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/auth", authRouter);

  app.use(authGuard);

  app.use(errorHandler);
  return app;
};
