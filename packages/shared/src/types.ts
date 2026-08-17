import type { z } from "zod";
import type { SEAT_SECTIONS, SEAT_STATES } from "./seats.js";
import type {
  authResponseSchema,
  createHoldRequestSchema,
  errorResponseSchema,
  holdSchema,
  loginRequestSchema,
  registerRequestSchema,
  reservationSchema,
  screeningSchema,
  seatMapRowSchema,
  seatMapSchema,
  seatsUpdatedEventSchema,
  seatViewSchema,
  userSchema,
} from "./schemas.js";

export type SeatState = (typeof SEAT_STATES)[number];
export type SeatSection = (typeof SEAT_SECTIONS)[number];

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type User = z.infer<typeof userSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;

export type Screening = z.infer<typeof screeningSchema>;
export type SeatView = z.infer<typeof seatViewSchema>;
export type SeatMapRow = z.infer<typeof seatMapRowSchema>;
export type SeatMap = z.infer<typeof seatMapSchema>;

export type CreateHoldRequest = z.infer<typeof createHoldRequestSchema>;
export type Hold = z.infer<typeof holdSchema>;
export type Reservation = z.infer<typeof reservationSchema>;

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

export type SeatsUpdatedEvent = z.infer<typeof seatsUpdatedEventSchema>;

export interface LayoutSectionConfig {
  section: SeatSection;
  rows: number;
  seatsPerRow: number;
}

export interface SeatBlueprint {
  rowLabel: string;
  rowIndex: number;
  seatNumber: number;
  section: SeatSection;
}

export interface RowSelection {
  row: SeatState[];
  selection: number[];
}

export type RuleErrorCode =
  | "EMPTY_SELECTION"
  | "OUT_OF_RANGE"
  | "DUPLICATE_SEAT"
  | "SEAT_UNAVAILABLE"
  | "NOT_CONSECUTIVE"
  | "ISOLATED_SEAT";

export type ValidationResult =
  | { ok: true }
  | { ok: false; code: RuleErrorCode; message: string };
