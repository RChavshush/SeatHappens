import type { SeatState } from "./types.js";

export const SEAT_STATES = ["available", "held", "booked"] as const;
export const SEAT_SECTIONS = ["main", "balcony"] as const;

export function isOccupied(state: SeatState): boolean {
  return state === "held" || state === "booked";
}
