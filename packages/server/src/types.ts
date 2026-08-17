import type { z } from "zod";
import type { envSchema } from "./env.js";

export type Env = z.infer<typeof envSchema>;

export type RequestPart = "body" | "query" | "params";

export interface AuthUserContext {
  id: string;
  email: string;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
}

export interface SeatOccupancy {
  bookedSeatIds: Set<string>;
  lockedSeatIds: Set<string>;
  myLockedSeatIds: Set<string>;
  lockExpiryBySeatId: Map<string, Date>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUserContext;
    }
  }
}
