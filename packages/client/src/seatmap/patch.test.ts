import { describe, expect, it } from "vitest";
import type { SeatMap, SeatsUpdatedEvent } from "@cinema/shared";
import { applySeatsUpdate } from "./patch";

const baseMap: SeatMap = {
  screeningId: "s1",
  rows: [
    {
      rowLabel: "A",
      section: "main",
      seats: [
        { id: "A1", rowLabel: "A", seatNumber: 1, section: "main", status: "available", heldByMe: false, holdExpiresAt: null },
        { id: "A2", rowLabel: "A", seatNumber: 2, section: "main", status: "available", heldByMe: false, holdExpiresAt: null },
      ],
    },
  ],
};

describe("applySeatsUpdate", () => {
  it("patches status and holdExpiresAt for matching seats", () => {
    const event: SeatsUpdatedEvent = {
      screeningId: "s1",
      seats: [{ id: "A1", status: "held", holdExpiresAt: "2026-08-17T10:00:00.000Z" }],
    };
    const result = applySeatsUpdate(baseMap, event, []);
    expect(result.rows[0]!.seats[0]!.status).toBe("held");
    expect(result.rows[0]!.seats[0]!.holdExpiresAt).toBe("2026-08-17T10:00:00.000Z");
    expect(result.rows[0]!.seats[1]!.status).toBe("available");
  });

  it("marks a held seat as heldByMe when it belongs to my hold", () => {
    const event: SeatsUpdatedEvent = {
      screeningId: "s1",
      seats: [{ id: "A1", status: "held", holdExpiresAt: null }],
    };
    expect(applySeatsUpdate(baseMap, event, ["A1"]).rows[0]!.seats[0]!.heldByMe).toBe(true);
    expect(applySeatsUpdate(baseMap, event, []).rows[0]!.seats[0]!.heldByMe).toBe(false);
  });
});
