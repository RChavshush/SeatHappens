import { isOccupied, type SeatState } from "./seats.js";

/**
 * Rule violation codes. Input-hygiene codes (EMPTY_SELECTION, OUT_OF_RANGE,
 * DUPLICATE_SEAT) map to HTTP 422 on the server; SEAT_UNAVAILABLE maps to 409;
 * NOT_CONSECUTIVE and ISOLATED_SEAT map to 422.
 */
export type RuleErrorCode =
  | "EMPTY_SELECTION"
  | "OUT_OF_RANGE"
  | "DUPLICATE_SEAT"
  | "SEAT_UNAVAILABLE"
  | "NOT_CONSECUTIVE"
  | "ISOLATED_SEAT";

export type ValidationResult =
  | { ok: true }
  | { ok: false; code: RuleErrorCode; message: string };

const ok: ValidationResult = { ok: true };
function fail(code: RuleErrorCode, message: string): ValidationResult {
  return { ok: false, code, message };
}

/**
 * Validate a seat selection against the two server-authoritative rules, over a
 * single row. Cross-row selections are rejected by the caller before this runs
 * (see the server's per-row grouping); this function assumes all indices refer
 * to one row.
 *
 * `row` is the current state of every seat in the row, indexed 0..len-1.
 * `selection` is the set of seat indices the user wants to hold.
 *
 * Rule 1: the selection must be contiguous within the row.
 * Rule 2: the selection must not *create* a single empty seat trapped between
 *   occupied seats. A trapped gap that already existed is left alone.
 */
export function validateSelection(
  row: SeatState[],
  selection: number[],
): ValidationResult {
  if (selection.length === 0) {
    return fail("EMPTY_SELECTION", "Select at least one seat.");
  }

  for (const i of selection) {
    if (!Number.isInteger(i) || i < 0 || i >= row.length) {
      return fail("OUT_OF_RANGE", `Seat index ${i} is outside the row.`);
    }
  }

  const unique = new Set(selection);
  if (unique.size !== selection.length) {
    return fail("DUPLICATE_SEAT", "The selection contains a duplicate seat.");
  }

  for (const i of selection) {
    // Non-null: bounds already checked above.
    if (isOccupied(row[i]!)) {
      return fail("SEAT_UNAVAILABLE", `Seat ${i + 1} is already taken.`);
    }
  }

  const sorted = [...selection].sort((a, b) => a - b);
  // Rule 1: contiguous. A single seat trivially passes.
  for (let k = 1; k < sorted.length; k++) {
    if (sorted[k]! !== sorted[k - 1]! + 1) {
      return fail(
        "NOT_CONSECUTIVE",
        "Selected seats must be consecutive and in the same row.",
      );
    }
  }

  // Rule 2: reject only gaps the selection newly creates.
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
}

/** Return a copy of the row with the selected seats marked occupied. */
function applySelection(row: SeatState[], selection: number[]): SeatState[] {
  const next = [...row];
  for (const i of selection) next[i] = "held";
  return next;
}

/**
 * Positions of every single empty seat trapped between two occupied seats.
 * A single empty seat touching a row edge (index 0 or len-1) is not trapped.
 */
function trappedSingles(row: SeatState[]): Set<number> {
  const trapped = new Set<number>();
  for (let i = 1; i < row.length - 1; i++) {
    const isSingleGap =
      !isOccupied(row[i]!) && isOccupied(row[i - 1]!) && isOccupied(row[i + 1]!);
    if (isSingleGap) trapped.add(i);
  }
  return trapped;
}
