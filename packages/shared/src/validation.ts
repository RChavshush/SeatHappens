import { RULE_ERROR_CODE } from "./ruleErrorCodes.js";
import { SEAT_STATE, isOccupied } from "./seats.js";
import type {
  RowSelection,
  RuleErrorCode,
  SeatState,
  ValidationResult,
} from "./types.js";

const ok: ValidationResult = { ok: true };

const fail = (code: RuleErrorCode, message: string): ValidationResult => ({
  ok: false,
  code,
  message,
});

export const validateSelection = (
  row: SeatState[],
  selection: number[],
): ValidationResult => {
  if (selection.length === 0) {
    return fail(RULE_ERROR_CODE.EMPTY_SELECTION, "Select at least one seat.");
  }

  for (const i of selection) {
    if (!Number.isInteger(i) || i < 0 || i >= row.length) {
      return fail(RULE_ERROR_CODE.OUT_OF_RANGE, `Seat index ${i} is outside the row.`);
    }
  }

  if (new Set(selection).size !== selection.length) {
    return fail(RULE_ERROR_CODE.DUPLICATE_SEAT, "The selection contains a duplicate seat.");
  }

  for (const i of selection) {
    if (isOccupied(row[i]!)) {
      return fail(RULE_ERROR_CODE.SEAT_UNAVAILABLE, `Seat ${i + 1} is already taken.`);
    }
  }

  const sorted = [...selection].sort((a, b) => a - b);
  for (let k = 1; k < sorted.length; k++) {
    if (sorted[k]! !== sorted[k - 1]! + 1) {
      return fail(
        RULE_ERROR_CODE.NOT_CONSECUTIVE,
        "Selected seats must be consecutive and in the same row.",
      );
    }
  }

  const before = trappedSingles(row);
  const after = trappedSingles(applySelection(row, selection));
  for (const idx of after) {
    if (!before.has(idx)) {
      return fail(
        RULE_ERROR_CODE.ISOLATED_SEAT,
        "This selection would trap a single empty seat between occupied seats.",
      );
    }
  }

  return ok;
};

export const validateRows = (rows: RowSelection[]): ValidationResult => {
  const active = rows.filter((r) => r.selection.length > 0);
  if (active.length === 0) {
    return fail(RULE_ERROR_CODE.EMPTY_SELECTION, "Select at least one seat.");
  }
  for (const { row, selection } of active) {
    const result = validateSelection(row, selection);
    if (!result.ok) return result;
  }
  if (!isConnected(active)) {
    return fail(
      RULE_ERROR_CODE.NOT_CONSECUTIVE,
      "All selected seats must be next to each other in one group.",
    );
  }
  return ok;
};

const isConnected = (rows: RowSelection[]): boolean => {
  const nodes = new Set<string>();
  const lastCol = new Map<number, number>();
  for (const { rowIndex, row, selection } of rows) {
    lastCol.set(rowIndex, row.length - 1);
    for (const col of selection) nodes.add(`${rowIndex}:${col}`);
  }
  const has = (r: number, c: number): boolean => nodes.has(`${r}:${c}`);

  const neighbors = (r: number, c: number): string[] => {
    const out: string[] = [];
    if (has(r, c - 1)) out.push(`${r}:${c - 1}`);
    if (has(r, c + 1)) out.push(`${r}:${c + 1}`);
    if (has(r - 1, c)) out.push(`${r - 1}:${c}`);
    if (has(r + 1, c)) out.push(`${r + 1}:${c}`);
    const endOfThis = lastCol.get(r);
    if (endOfThis !== undefined && c === endOfThis && has(r + 1, 0)) {
      out.push(`${r + 1}:0`);
    }
    const endOfPrev = lastCol.get(r - 1);
    if (c === 0 && endOfPrev !== undefined && has(r - 1, endOfPrev)) {
      out.push(`${r - 1}:${endOfPrev}`);
    }
    return out;
  };

  const start = nodes.values().next().value;
  if (start === undefined) return true;
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.pop()!;
    const [r, c] = current.split(":").map(Number) as [number, number];
    for (const next of neighbors(r, c)) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen.size === nodes.size;
};

const applySelection = (
  row: SeatState[],
  selection: number[],
): SeatState[] => {
  const next = [...row];
  for (const i of selection) next[i] = SEAT_STATE.held;
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
