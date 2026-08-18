import { SEAT_STATE, isOccupied, validateRows } from "@cinema/shared";
import type { RowSelection, SeatMap, SeatView } from "@cinema/shared";
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

const buildRowSelections = (
  seatMap: SeatMap,
  selectedIds: ReadonlySet<string>,
): RowSelection[] =>
  seatMap.rows.map((row, rowIndex) => ({
    rowIndex,
    row: row.seats.map((seat) => (seat.heldByMe ? SEAT_STATE.available : seat.status)),
    selection: row.seats.flatMap((seat, index) =>
      selectedIds.has(seat.id) ? [index] : [],
    ),
  }));

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

  const candidate = new Set(selected);
  candidate.add(seat.id);
  const result = validateRows(buildRowSelections(seatMap, candidate));
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
