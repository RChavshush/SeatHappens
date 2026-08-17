import { isOccupied, validateSelection } from "@cinema/shared";
import type { SeatMap, SeatMapRow, SeatState, SeatView } from "@cinema/shared";
import type { SeatEvaluation, SeatVariant } from "./types";

export const seatVariant = (seat: SeatView): SeatVariant =>
  seat.status === "booked"
    ? "booked"
    : seat.status === "held"
      ? seat.heldByMe
        ? "mine"
        : "held"
      : "available";

const rowStates = (row: SeatMapRow): SeatState[] => row.seats.map((seat) => seat.status);

const selectionIndexes = (row: SeatMapRow, selected: ReadonlySet<string>): number[] =>
  row.seats.flatMap((seat, index) => (selected.has(seat.id) ? [index] : []));

export const activeRowLabel = (
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
  row: SeatMapRow,
  seat: SeatView,
  seatIndex: number,
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
  if (active && active !== row.rowLabel) return { disabled: false };

  const candidate = [...selectionIndexes(row, selected), seatIndex];
  const result = validateSelection(rowStates(row), candidate);
  return result.ok ? { disabled: false } : { disabled: true, reason: result.message };
};

export const nextSelection = (
  seatMap: SeatMap | undefined,
  selected: ReadonlySet<string>,
  seat: SeatView,
): Set<string> => {
  const next = new Set(selected);
  if (next.has(seat.id)) {
    next.delete(seat.id);
    return next;
  }
  if (seatMap && activeRowLabel(seatMap, selected) !== seat.rowLabel && next.size > 0) {
    return new Set([seat.id]);
  }
  next.add(seat.id);
  return next;
};

export const selectedSeatIds = (
  seatMap: SeatMap,
  selected: ReadonlySet<string>,
): string[] =>
  seatMap.rows.flatMap((row) =>
    row.seats.filter((seat) => selected.has(seat.id)).map((seat) => seat.id),
  );
