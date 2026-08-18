import type { z } from "zod";
import type { ERROR_CODE } from "./errorCodes.js";
import type { HOLD_STATUS } from "./holdStatus.js";
import type { RULE_ERROR_CODE } from "./ruleErrorCodes.js";
import type { SEAT_SECTIONS, SEAT_STATE } from "./seats.js";
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

export type SeatState = (typeof SEAT_STATE)[keyof typeof SEAT_STATE];
export type SeatSection = (typeof SEAT_SECTIONS)[number];

export type HoldStatus = (typeof HOLD_STATUS)[keyof typeof HOLD_STATUS];
export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];

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
  rowIndex: number;
  row: SeatState[];
  selection: number[];
}

export type RuleErrorCode = (typeof RULE_ERROR_CODE)[keyof typeof RULE_ERROR_CODE];

export type ValidationResult =
  | { ok: true }
  | { ok: false; code: RuleErrorCode; message: string };
