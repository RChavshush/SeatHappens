import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import { authGuard } from "../auth/guard.js";
import { authRouter } from "../auth/routes.js";
import { env } from "../env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { holdsRouter } from "./routes/holds.js";
import { meRouter } from "./routes/me.js";
import { reservationsRouter } from "./routes/reservations.js";
import { screeningsRouter } from "./routes/screenings.js";

export const buildApp = (): Express => {
  const app = express();

  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(cookieParser());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/auth", authRouter);

  app.use(authGuard);

  app.use("/screenings", screeningsRouter);
  app.use("/holds", holdsRouter);
  app.use("/reservations", reservationsRouter);
  app.use("/me", meRouter);

  app.use(errorHandler);
  return app;
};
