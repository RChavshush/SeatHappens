import { z } from "zod";
import { SEAT_SECTIONS, SEAT_STATES } from "./seats.js";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const emailSchema = z.string().trim().toLowerCase().email();
export const passwordSchema = z.string().min(8).max(100);

export const registerRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1).max(80),
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
});
export type User = z.infer<typeof userSchema>;

export const authResponseSchema = z.object({
  token: z.string(),
  user: userSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

// ---------------------------------------------------------------------------
// Screenings and seat map
// ---------------------------------------------------------------------------

export const screeningSchema = z.object({
  id: z.string(),
  movieTitle: z.string(),
  startsAt: z.string().datetime(),
});
export type Screening = z.infer<typeof screeningSchema>;

export const seatStateSchema = z.enum(SEAT_STATES);
export const seatSectionSchema = z.enum(SEAT_SECTIONS);

export const seatViewSchema = z.object({
  id: z.string(),
  rowLabel: z.string(),
  seatNumber: z.number().int().positive(),
  section: seatSectionSchema,
  status: seatStateSchema,
  /** True when the current user owns the hold on this seat. */
  heldByMe: z.boolean(),
  /** When the current hold expires, ISO-8601, or null if not held. */
  holdExpiresAt: z.string().datetime().nullable(),
});
export type SeatView = z.infer<typeof seatViewSchema>;

export const seatMapRowSchema = z.object({
  rowLabel: z.string(),
  section: seatSectionSchema,
  seats: z.array(seatViewSchema),
});
export type SeatMapRow = z.infer<typeof seatMapRowSchema>;

export const seatMapSchema = z.object({
  screeningId: z.string(),
  rows: z.array(seatMapRowSchema),
});
export type SeatMap = z.infer<typeof seatMapSchema>;

// ---------------------------------------------------------------------------
// Holds and reservations
// ---------------------------------------------------------------------------

export const createHoldRequestSchema = z.object({
  seatIds: z.array(z.string()).min(1).max(10),
});
export type CreateHoldRequest = z.infer<typeof createHoldRequestSchema>;

export const holdSchema = z.object({
  id: z.string(),
  screeningId: z.string(),
  seatIds: z.array(z.string()),
  expiresAt: z.string().datetime(),
  status: z.enum(["active", "confirmed", "cancelled", "expired"]),
});
export type Hold = z.infer<typeof holdSchema>;

export const reservationSchema = z.object({
  id: z.string(),
  screeningId: z.string(),
  referenceCode: z.string(),
  seatIds: z.array(z.string()),
  confirmedAt: z.string().datetime(),
});
export type Reservation = z.infer<typeof reservationSchema>;

// ---------------------------------------------------------------------------
// Error envelope
// ---------------------------------------------------------------------------

/** Every error code the API can return, as a stable client-facing contract. */
export const API_ERROR_CODES = [
  "VALIDATION_FAILED",
  "UNAUTHORIZED",
  "SEAT_UNAVAILABLE",
  "NOT_CONSECUTIVE",
  "ISOLATED_SEAT",
  "HOLD_EXPIRED",
  "HOLD_NOT_FOUND",
  "NOT_FOUND",
  "CONFLICT",
  "INTERNAL",
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const errorResponseSchema = z.object({
  code: z.enum(API_ERROR_CODES),
  message: z.string(),
  details: z.unknown().optional(),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

// ---------------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------------

/** Payload broadcast on `seats:updated` when seat states change. */
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
export type SeatsUpdatedEvent = z.infer<typeof seatsUpdatedEventSchema>;
