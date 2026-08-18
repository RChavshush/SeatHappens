import { describe, expect, it } from "vitest";
import type { SeatMap, SeatMapRow, SeatState, SeatView } from "@cinema/shared";
import { evaluateSeat, nextSelection, seatVariant } from "./selection";

const seat = (rowLabel: string, seatNumber: number, status: SeatState, heldByMe = false): SeatView => ({
  id: `${rowLabel}${seatNumber}`,
  rowLabel,
  seatNumber,
  status,
  heldByMe,
  holdExpiresAt: null,
});

const buildRow = (rowLabel: string, statuses: SeatState[]): SeatMapRow => ({
  rowLabel,
  seats: statuses.map((status, index) => seat(rowLabel, index + 1, status)),
});

const buildMap = (rows: SeatMapRow[]): SeatMap => ({ screeningId: "s1", rows });

describe("seatVariant", () => {
  it("maps a held-by-me seat to mine", () => {
    expect(seatVariant(seat("A", 1, "held", true))).toBe("mine");
    expect(seatVariant(seat("A", 2, "held"))).toBe("held");
    expect(seatVariant(seat("A", 3, "booked"))).toBe("booked");
    expect(seatVariant(seat("A", 4, "available"))).toBe("available");
  });
});

describe("evaluateSeat", () => {
  const row = buildRow("A", ["available", "available", "available", "booked", "available"]);
  const map = buildMap([row]);

  it("disables an occupied seat with a reason", () => {
    const result = evaluateSeat(map, row.seats[3]!, new Set());
    expect(result.disabled).toBe(true);
    expect(result.reason).toMatch(/taken/i);
  });

  it("disables a non-consecutive addition", () => {
    const result = evaluateSeat(map, row.seats[2]!, new Set(["A1"]));
    expect(result.disabled).toBe(true);
    expect(result.reason).toMatch(/next to each other|consecutive/i);
  });

  it("disables a selection that would isolate a seat", () => {
    const isolate = buildRow("B", ["available", "available", "booked"]);
    const isolateMap = buildMap([isolate]);
    const result = evaluateSeat(isolateMap, isolate.seats[0]!, new Set());
    expect(result.disabled).toBe(true);
    expect(result.reason).toMatch(/trap|isolate|single/i);
  });

  it("allows a seat directly behind the active selection (connected)", () => {
    const other = buildRow("B", ["available"]);
    const twoRowMap = buildMap([row, other]);
    const result = evaluateSeat(twoRowMap, other.seats[0]!, new Set(["A1"]));
    expect(result.disabled).toBe(false);
  });

  it("allows extending your own already-held seats", () => {
    const held = buildRow("A", ["held", "available"]);
    held.seats[0] = { ...held.seats[0]!, heldByMe: true };
    const heldMap = buildMap([held]);
    const result = evaluateSeat(heldMap, held.seats[1]!, new Set(["A1"]));
    expect(result.disabled).toBe(false);
  });

  it("disables a seat disconnected from the active selection", () => {
    // A1 selected; B3 in the next row touches nothing selected
    const other = buildRow("B", ["available", "available", "available"]);
    const twoRowMap = buildMap([row, other]);
    const result = evaluateSeat(twoRowMap, other.seats[2]!, new Set(["A1"]));
    expect(result.disabled).toBe(true);
  });
});

describe("nextSelection", () => {
  const map = buildMap([buildRow("A", ["available", "available"]), buildRow("B", ["available"])]);

  it("toggles a seat off", () => {
    const result = nextSelection(new Set(["A1"]), map.rows[0]!.seats[0]!);
    expect(result.has("A1")).toBe(false);
  });

  it("accumulates a seat in another row (multi-row)", () => {
    const result = nextSelection(new Set(["A1"]), map.rows[1]!.seats[0]!);
    expect([...result].sort()).toEqual(["A1", "B1"]);
  });

  it("extends the selection within the same row", () => {
    const result = nextSelection(new Set(["A1"]), map.rows[0]!.seats[1]!);
    expect([...result].sort()).toEqual(["A1", "A2"]);
  });
});
