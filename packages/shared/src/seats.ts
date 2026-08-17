import type { SeatState } from "./types.js";

export const SEAT_STATES = ["available", "held", "booked"] as const;
export const SEAT_SECTIONS = ["main", "balcony"] as const;

export const isOccupied = (state: SeatState): boolean =>
  state === "held" || state === "booked";
