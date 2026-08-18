import type { SeatState } from "./types.js";

export const SEAT_STATE = {
  available: "available",
  held: "held",
  booked: "booked",
} as const;

export const SEAT_SECTIONS = ["main", "balcony"] as const;

export const isOccupied = (state: SeatState): boolean =>
  state === SEAT_STATE.held || state === SEAT_STATE.booked;
