import { SEAT_STATE, isOccupied, validateSelection } from "@cinema/shared";
import type { SeatMap, SeatMapRow, SeatState, SeatView } from "@cinema/shared";
import type { SeatEvaluation, SeatVariant } from "./types";
import { SEAT_VARIANT } from "./variants";

export const seatVariant = (seat: SeatView): SeatVariant =>
  seat.status === SEAT_STATE.booked
    ? seat.bookedByMe
      ? SEAT_VARIANT.mineBooked
      : SEAT_VARIANT.booked
    : seat.status === SEAT_STATE.held
      ? seat.heldByMe
        ? SEAT_VARIANT.mine
        : SEAT_VARIANT.held
      : SEAT_VARIANT.available;

// A selected seat is the user's own intent, so treat it as available even if a
// realtime seatsUpdated broadcast racing ahead of the hold's HTTP reply has
// transiently marked it taken-by-others; otherwise the next seat's validation
// fails and its click is swallowed.
const rowStates = (row: SeatMapRow, selected: ReadonlySet<string>): SeatState[] =>
  row.seats.map((seat) =>
    seat.heldByMe || selected.has(seat.id) ? SEAT_STATE.available : seat.status,
  );

const selectionIndexes = (row: SeatMapRow, selected: ReadonlySet<string>): number[] =>
  row.seats.flatMap((seat, index) => (selected.has(seat.id) ? [index] : []));

const activeRowLabel = (
  seatMap: SeatMap,
  selected: ReadonlySet<string>,
): string | null => {
  for (const row of seatMap.rows) {
    for (const seat of row.seats) {
      if (selected.has(seat.id)) return row.rowLabel;
    }
  }
  return null;
};

export const evaluateSeat = (
  seatMap: SeatMap,
  seat: SeatView,
  selected: ReadonlySet<string>,
): SeatEvaluation => {
  if (selected.has(seat.id)) return { disabled: false };

  if (isOccupied(seat.status)) {
    return {
      disabled: true,
      reason: seat.heldByMe ? "You are holding this seat." : "This seat is taken.",
    };
  }

  const active = activeRowLabel(seatMap, selected);
  if (active !== null && active !== seat.rowLabel) {
    return { disabled: true, reason: "Selected seats must be in the same row." };
  }

  const row = seatMap.rows.find((r) => r.rowLabel === seat.rowLabel);
  if (!row) return { disabled: false };
  const seatIndex = row.seats.findIndex((s) => s.id === seat.id);
  const candidate = [...selectionIndexes(row, selected), seatIndex];
  const result = validateSelection(rowStates(row, selected), candidate);
  return result.ok ? { disabled: false } : { disabled: true, reason: result.message };
};

export const nextSelection = (
  selected: ReadonlySet<string>,
  seat: SeatView,
): Set<string> => {
  const next = new Set(selected);
  if (next.has(seat.id)) {
    next.delete(seat.id);
  } else {
    next.add(seat.id);
  }
  return next;
};

export const selectedSeatIds = (
  seatMap: SeatMap,
  selected: ReadonlySet<string>,
): string[] =>
  seatMap.rows.flatMap((row) =>
    row.seats.filter((seat) => selected.has(seat.id)).map((seat) => seat.id),
  );

export const labelForSeats = (
  seatMap: SeatMap,
  ids: readonly string[],
): string[] => {
  const byId = new Map<string, string>();
  for (const row of seatMap.rows) {
    for (const seat of row.seats) {
      byId.set(seat.id, `${seat.rowLabel}${seat.seatNumber}`);
    }
  }
  return ids.map((id) => byId.get(id) ?? id);
};
