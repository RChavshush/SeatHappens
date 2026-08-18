import { z } from "zod";
import { HOLD_STATUS } from "./holdStatus.js";
import { SEAT_STATE } from "./seats.js";

export const emailSchema = z.string().trim().toLowerCase().email();
export const passwordSchema = z.string().min(8).max(100);

export const registerRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1).max(80),
});

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
});

export const authResponseSchema = z.object({
  user: userSchema,
});

export const screeningSchema = z.object({
  id: z.string(),
  movieTitle: z.string(),
  startsAt: z.string().datetime(),
});

export const seatStateSchema = z.nativeEnum(SEAT_STATE);

export const seatViewSchema = z.object({
  id: z.string(),
  rowLabel: z.string(),
  seatNumber: z.number().int().positive(),
  status: seatStateSchema,
  heldByMe: z.boolean(),
  holdExpiresAt: z.string().datetime().nullable(),
});

export const seatMapRowSchema = z.object({
  rowLabel: z.string(),
  seats: z.array(seatViewSchema),
});

export const seatMapSchema = z.object({
  screeningId: z.string(),
  rows: z.array(seatMapRowSchema),
});

export const createHoldRequestSchema = z.object({
  seatIds: z.array(z.string()).min(1),
});

export const holdSchema = z.object({
  id: z.string(),
  screeningId: z.string(),
  seatIds: z.array(z.string()),
  expiresAt: z.string().datetime(),
  status: z.nativeEnum(HOLD_STATUS),
});

export const reservationSchema = z.object({
  id: z.string(),
  screeningId: z.string(),
  referenceCode: z.string(),
  seatIds: z.array(z.string()),
  confirmedAt: z.string().datetime(),
});

export const errorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export const seatsUpdatedEventSchema = z.object({
  screeningId: z.string(),
  seats: z.array(
    z.object({
      id: z.string(),
      status: seatStateSchema,
      holdExpiresAt: z.string().datetime().nullable(),
    }),
  ),
});
