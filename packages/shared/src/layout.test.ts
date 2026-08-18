import { describe, expect, it } from "vitest";
import { CINEMA_LAYOUT, buildSeatLayout, rowLabel } from "./layout.js";

describe("rowLabel", () => {
  it("maps indices to spreadsheet-style labels", () => {
    expect(rowLabel(0)).toBe("A");
    expect(rowLabel(12)).toBe("M");
    expect(rowLabel(25)).toBe("Z");
    expect(rowLabel(26)).toBe("AA");
  });
});

describe("buildSeatLayout", () => {
  it("builds the default 115-seat auditorium", () => {
    const seats = buildSeatLayout(CINEMA_LAYOUT);
    expect(seats).toHaveLength(115);

    expect(seats[0]).toEqual({
      rowIndex: 0,
      seatNumber: 1,
    });
    expect(seats.at(-1)).toEqual({
      rowIndex: 12,
      seatNumber: 5,
    });
  });

  it("reflects a changed configuration", () => {
    const seats = buildSeatLayout([{ rows: 12, seatsPerRow: 12 }]);
    expect(seats).toHaveLength(144);
    expect(new Set(seats.map((s) => s.rowIndex)).size).toBe(12);
  });
});
