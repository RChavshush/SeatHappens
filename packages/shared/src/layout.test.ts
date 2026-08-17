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

    const main = seats.filter((s) => s.section === "main");
    const balcony = seats.filter((s) => s.section === "balcony");
    expect(main).toHaveLength(100);
    expect(balcony).toHaveLength(15);

    expect(seats[0]).toEqual({
      rowLabel: "A",
      rowIndex: 0,
      seatNumber: 1,
      section: "main",
    });
    expect(seats.at(-1)).toEqual({
      rowLabel: "M",
      rowIndex: 12,
      seatNumber: 5,
      section: "balcony",
    });
  });

  it("reflects a changed configuration", () => {
    const seats = buildSeatLayout([{ section: "main", rows: 12, seatsPerRow: 12 }]);
    expect(seats).toHaveLength(144);
    expect(new Set(seats.map((s) => s.rowLabel)).size).toBe(12);
  });
});
