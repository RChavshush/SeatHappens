import { isOccupied } from "./seats.js";
import type { RuleErrorCode, SeatState, ValidationResult } from "./types.js";

const ok: ValidationResult = { ok: true };

const fail = (code: RuleErrorCode, message: string): ValidationResult => ({
  ok: false,
  code,
  message,
});

/**
 * Validate a seat selection over a single row. Cross-row selections are
 * rejected by the caller before this runs, so all indices refer to one row.
 * Rule 1: the selection must be contiguous. Rule 2: it must not *create* a
 * single empty seat trapped between occupied seats; a gap that already existed
 * is left untouched.
 */
export const validateSelection = (
  row: SeatState[],
  selection: number[],
): ValidationResult => {
  if (selection.length === 0) {
    return fail("EMPTY_SELECTION", "Select at least one seat.");
  }

  for (const i of selection) {
    if (!Number.isInteger(i) || i < 0 || i >= row.length) {
      return fail("OUT_OF_RANGE", `Seat index ${i} is outside the row.`);
    }
  }

  if (new Set(selection).size !== selection.length) {
    return fail("DUPLICATE_SEAT", "The selection contains a duplicate seat.");
  }

  for (const i of selection) {
    if (isOccupied(row[i]!)) {
      return fail("SEAT_UNAVAILABLE", `Seat ${i + 1} is already taken.`);
    }
  }

  const sorted = [...selection].sort((a, b) => a - b);
  for (let k = 1; k < sorted.length; k++) {
    if (sorted[k]! !== sorted[k - 1]! + 1) {
      return fail(
        "NOT_CONSECUTIVE",
        "Selected seats must be consecutive and in the same row.",
      );
    }
  }

  const before = trappedSingles(row);
  const after = trappedSingles(applySelection(row, selection));
  for (const idx of after) {
    if (!before.has(idx)) {
      return fail(
        "ISOLATED_SEAT",
        "This selection would trap a single empty seat between occupied seats.",
      );
    }
  }

  return ok;
};

const applySelection = (
  row: SeatState[],
  selection: number[],
): SeatState[] => {
  const next = [...row];
  for (const i of selection) next[i] = "held";
  return next;
};

const trappedSingles = (row: SeatState[]): Set<number> => {
  const trapped = new Set<number>();
  for (let i = 1; i < row.length - 1; i++) {
    const isSingleGap =
      !isOccupied(row[i]!) && isOccupied(row[i - 1]!) && isOccupied(row[i + 1]!);
    if (isSingleGap) trapped.add(i);
  }
  return trapped;
};
