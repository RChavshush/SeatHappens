// Seat domain types shared by client and server.

/** Every seat state, as a single source for both the type and the Zod enum. */
export const SEAT_STATES = ["available", "held", "booked"] as const;

/** A seat's state within a single screening. */
export type SeatState = (typeof SEAT_STATES)[number];

/** Seating sections in the auditorium. */
export const SEAT_SECTIONS = ["main", "balcony"] as const;
export type SeatSection = (typeof SEAT_SECTIONS)[number];

/**
 * A seat counts as "occupied" for the gap rule when it is held by any hold
 * (including the current user's own) or permanently booked. Only "available"
 * seats are empty.
 */
export function isOccupied(state: SeatState): boolean {
  return state === "held" || state === "booked";
}
