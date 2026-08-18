import { describe, expect, it } from "vitest";
import { validateRows, validateSelection } from "./validation.js";
import type { SeatState } from "./seats.js";

// Helpers to build a row from a compact string.
//   '.' = available, '#' = occupied (held or booked)
function row(pattern: string): SeatState[] {
  return [...pattern.replace(/\s/g, "")].map((c) =>
    c === "#" ? "booked" : "available",
  );
}

describe("validateSelection — input hygiene", () => {
  const empty = row("..........");

  it("rejects an empty selection", () => {
    expect(validateSelection(empty, [])).toMatchObject({
      ok: false,
      code: "EMPTY_SELECTION",
    });
  });

  it("rejects an out-of-range index", () => {
    expect(validateSelection(empty, [10])).toMatchObject({
      ok: false,
      code: "OUT_OF_RANGE",
    });
    expect(validateSelection(empty, [-1])).toMatchObject({
      ok: false,
      code: "OUT_OF_RANGE",
    });
  });

  it("rejects duplicate indices", () => {
    expect(validateSelection(empty, [2, 2, 3])).toMatchObject({
      ok: false,
      code: "DUPLICATE_SEAT",
    });
  });

  it("rejects selecting a seat that is already occupied", () => {
    // seat idx 2 booked, user tries to select it
    expect(validateSelection(row("..#......."), [2])).toMatchObject({
      ok: false,
      code: "SEAT_UNAVAILABLE",
    });
  });
});

describe("validateSelection — Rule 1: consecutive within a row", () => {
  const empty = row("..........");

  it("accepts a single seat", () => {
    expect(validateSelection(empty, [5])).toEqual({ ok: true });
  });

  it("accepts consecutive seats", () => {
    expect(validateSelection(empty, [4, 5, 6])).toEqual({ ok: true });
  });

  it("accepts consecutive seats given out of order", () => {
    expect(validateSelection(empty, [6, 4, 5])).toEqual({ ok: true });
  });

  it("rejects a gap in the selection (5,7)", () => {
    // seat 4 (idx 3) booked so the trapped-gap rule doesn't also fire first
    expect(validateSelection(row("...#......"), [4, 6])).toMatchObject({
      ok: false,
      code: "NOT_CONSECUTIVE",
    });
  });

  it("rejects a selection with an internal missing seat (2,3,5)", () => {
    expect(validateSelection(empty, [1, 2, 4])).toMatchObject({
      ok: false,
      code: "NOT_CONSECUTIVE",
    });
  });
});

describe("validateSelection — Rule 2: no newly trapped single seat", () => {
  // PDF example 1 — valid: seats 1,2 booked, select 3,4
  it("accepts a selection adjacent to a booked block (PDF ex.1)", () => {
    //   # # * * . . . . . .
    expect(validateSelection(row("##........"), [2, 3])).toEqual({ ok: true });
  });

  // PDF example 2 — invalid: seats 1,2 booked, select 4,5 (traps seat 3)
  it("rejects a selection that traps a single empty seat (PDF ex.2)", () => {
    //   # # . * * . . . . .   -> seat idx 2 trapped between idx1 and idx3
    expect(validateSelection(row("##........"), [3, 4])).toMatchObject({
      ok: false,
      code: "ISOLATED_SEAT",
    });
  });

  // PDF example 3 — valid (edge): empty row, select seats 2..10
  it("accepts a single empty seat left at the row edge (PDF ex.3)", () => {
    //   . * * * * * * * * *   -> seat idx 0 alone at the wall, allowed
    expect(validateSelection(row(".........."), [1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual(
      { ok: true },
    );
  });

  it("accepts a two-wide gap between occupied blocks", () => {
    //   # # . . * * . . . .  -> gap at idx 2,3 is width 2, allowed
    expect(validateSelection(row("##........"), [4, 5])).toEqual({ ok: true });
  });

  it("allows a pre-existing trapped gap the selection did not create", () => {
    // idx 0,1 booked and idx 3,4 booked already trap idx 2 (single empty).
    // Selecting idx 7,8 leaves idx 5,6 as a width-2 gap and idx 9 at the edge,
    // creating no new trapped single — the pre-existing idx 2 gap must not block it.
    //   # # . # # . . * * .
    expect(validateSelection(row("##.##....."), [7, 8])).toEqual({ ok: true });
  });

  it("rejects trapping a seat against the far edge block", () => {
    // last seat booked (idx 9), select idx 7 -> traps idx 8 between 7 and 9
    //   . . . . . . . * . #
    expect(validateSelection(row(".........#"), [7])).toMatchObject({
      ok: false,
      code: "ISOLATED_SEAT",
    });
  });
});

describe("validateSelection — 5-seat balcony rows", () => {
  it("accepts consecutive seats in a short row", () => {
    expect(validateSelection(row("....."), [0, 1])).toEqual({ ok: true });
  });

  it("allows a single empty seat at the edge of a short row", () => {
    //   . * * * *  -> idx 0 alone at edge, allowed
    expect(validateSelection(row("....."), [1, 2, 3, 4])).toEqual({ ok: true });
  });

  it("rejects trapping a single seat in a short row", () => {
    //   # . * . .  -> select idx 2, traps idx 1 between idx0 and idx2
    expect(validateSelection(row("#...."), [2])).toMatchObject({
      ok: false,
      code: "ISOLATED_SEAT",
    });
  });
});

describe("validateRows — multi-row selection (connected group)", () => {
  const empty5 = (): SeatState[] => Array(5).fill("available");

  it("accepts a block aligned across two rows (same columns)", () => {
    // K2,3,4 + L2,3,4 — connected vertically
    expect(
      validateRows([
        { rowIndex: 0, row: empty5(), selection: [1, 2, 3] },
        { rowIndex: 1, row: empty5(), selection: [1, 2, 3] },
      ]),
    ).toEqual({ ok: true });
  });

  it("accepts a run that wraps from a row end to the next row start", () => {
    // K2,3,4,5 + L1 — L1 connects to K5 via the wrap (PDF image 2)
    expect(
      validateRows([
        { rowIndex: 0, row: empty5(), selection: [1, 2, 3, 4] },
        { rowIndex: 1, row: empty5(), selection: [0] },
      ]),
    ).toEqual({ ok: true });
  });

  it("rejects a seat left disconnected in another row", () => {
    // K2,3,4 + L1 — L1 touches no selected seat (image 1)
    expect(
      validateRows([
        { rowIndex: 0, row: empty5(), selection: [1, 2, 3] },
        { rowIndex: 1, row: empty5(), selection: [0] },
      ]),
    ).toMatchObject({ ok: false, code: "NOT_CONSECUTIVE" });
  });

  it("rejects blocks in non-adjacent rows", () => {
    // rows 0 and 2 aligned but row 1 between them is empty
    expect(
      validateRows([
        { rowIndex: 0, row: empty5(), selection: [1, 2] },
        { rowIndex: 2, row: empty5(), selection: [1, 2] },
      ]),
    ).toMatchObject({ ok: false, code: "NOT_CONSECUTIVE" });
  });

  it("ignores rows with no selection", () => {
    expect(
      validateRows([
        { rowIndex: 0, row: empty5(), selection: [] },
        { rowIndex: 1, row: empty5(), selection: [3, 4] },
      ]),
    ).toEqual({ ok: true });
  });

  it("rejects when a row's own run is not consecutive", () => {
    expect(
      validateRows([
        { rowIndex: 0, row: empty5(), selection: [0, 1] },
        { rowIndex: 1, row: empty5(), selection: [0, 2] },
      ]),
    ).toMatchObject({ ok: false, code: "NOT_CONSECUTIVE" });
  });

  it("rejects when a row traps a single seat", () => {
    const trapRow: SeatState[] = ["booked", "booked", "available", "available", "available"];
    expect(
      validateRows([
        { rowIndex: 0, row: empty5(), selection: [0, 1] },
        { rowIndex: 1, row: trapRow, selection: [3, 4] },
      ]),
    ).toMatchObject({ ok: false, code: "ISOLATED_SEAT" });
  });

  it("rejects an entirely empty multi-row selection", () => {
    expect(
      validateRows([
        { rowIndex: 0, row: empty5(), selection: [] },
        { rowIndex: 1, row: empty5(), selection: [] },
      ]),
    ).toMatchObject({ ok: false, code: "EMPTY_SELECTION" });
  });
});

describe("validateRows — width-aware boundary (main↔balcony)", () => {
  const empty10 = (): SeatState[] => Array(10).fill("available");
  const empty5 = (): SeatState[] => Array(5).fill("available");

  it("does not connect different-width rows by matching column", () => {
    // J5 (10-wide, col 4) + K5 (5-wide, col 4): same index, different width -> not a group
    expect(
      validateRows([
        { rowIndex: 9, row: empty10(), selection: [4] },
        { rowIndex: 10, row: empty5(), selection: [4] },
      ]),
    ).toMatchObject({ ok: false, code: "NOT_CONSECUTIVE" });
  });

  it("connects different-width rows only at seat 1 via the wrap", () => {
    // J10 (10-wide, last col 9) + K1 (5-wide, col 0): wrap into index 1 -> connected
    expect(
      validateRows([
        { rowIndex: 9, row: empty10(), selection: [9] },
        { rowIndex: 10, row: empty5(), selection: [0] },
      ]),
    ).toEqual({ ok: true });
  });

  it("rejects a column-aligned balcony seat when the main run does not reach its end", () => {
    // E4-8..J5,J6 style: main cols 3-5, balcony col 4 (K5) aligned but no J10 -> disconnected
    expect(
      validateRows([
        { rowIndex: 9, row: empty10(), selection: [3, 4, 5] },
        { rowIndex: 10, row: empty5(), selection: [4] },
      ]),
    ).toMatchObject({ ok: false, code: "NOT_CONSECUTIVE" });
  });
});
