import { SEAT_STATE } from "@cinema/shared";
import type { SeatBroadcaster, SeatDelta } from "../types.js";

let broadcaster: SeatBroadcaster | null = null;

export const setBroadcaster = (next: SeatBroadcaster | null): void => {
  broadcaster = next;
};

export const broadcastSeatUpdates = (screeningId: string, seats: SeatDelta[]): void => {
  if (seats.length > 0) broadcaster?.(screeningId, seats);
};

export const heldDeltas = (seatIds: string[], holdExpiresAt: string): SeatDelta[] =>
  seatIds.map((id) => ({ id, status: SEAT_STATE.held, holdExpiresAt }));

export const availableDeltas = (seatIds: string[]): SeatDelta[] =>
  seatIds.map((id) => ({ id, status: SEAT_STATE.available, holdExpiresAt: null }));

export const bookedDeltas = (seatIds: string[]): SeatDelta[] =>
  seatIds.map((id) => ({ id, status: SEAT_STATE.booked, holdExpiresAt: null }));
