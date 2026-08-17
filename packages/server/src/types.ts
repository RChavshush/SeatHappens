import type { z } from "zod";
import type { Hold, Reservation } from "@cinema/shared";
import type { envSchema } from "./env.js";
import type { Prisma } from "./generated/prisma/index.js";

export type Env = z.infer<typeof envSchema>;

export type Tx = Prisma.TransactionClient;

export interface HoldMutationResult {
  hold: Hold;
  heldSeatIds: string[];
  releasedSeatIds: string[];
}

export interface ConfirmResult {
  reservation: Reservation;
  bookedSeatIds: string[];
  screeningId: string;
}

export interface ReleaseResult {
  screeningId: string;
  releasedSeatIds: string[];
}

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
