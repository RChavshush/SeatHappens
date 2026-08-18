import { describe, expect, it } from "vitest";
import type { SeatMap, SeatsUpdatedEvent } from "@cinema/shared";
import { applySeatsUpdate } from "./patch";

const baseMap: SeatMap = {
  screeningId: "s1",
  rows: [
    {
      rowLabel: "A",
      seats: [
        { id: "A1", rowLabel: "A", seatNumber: 1, status: "available", heldByMe: false, bookedByMe: false, holdExpiresAt: null },
        { id: "A2", rowLabel: "A", seatNumber: 2, status: "available", heldByMe: false, bookedByMe: false, holdExpiresAt: null },
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

  it("marks a booked seat as bookedByMe when it was in my hold", () => {
    const event: SeatsUpdatedEvent = {
      screeningId: "s1",
      seats: [{ id: "A1", status: "booked", holdExpiresAt: null }],
    };
    expect(applySeatsUpdate(baseMap, event, ["A1"]).rows[0]!.seats[0]!.bookedByMe).toBe(true);
    expect(applySeatsUpdate(baseMap, event, []).rows[0]!.seats[0]!.bookedByMe).toBe(false);
  });

  it("clears bookedByMe on patched seats (deltas carry no owner)", () => {
    const mineBookedMap: SeatMap = {
      ...baseMap,
      rows: [
        {
          rowLabel: "A",
          seats: [
            { ...baseMap.rows[0]!.seats[0]!, status: "booked", bookedByMe: true },
            baseMap.rows[0]!.seats[1]!,
          ],
        },
      ],
    };
    const event: SeatsUpdatedEvent = {
      screeningId: "s1",
      seats: [{ id: "A1", status: "available", holdExpiresAt: null }],
    };
    const patched = applySeatsUpdate(mineBookedMap, event, []).rows[0]!.seats[0]!;
    expect(patched.status).toBe("available");
    expect(patched.bookedByMe).toBe(false);
  });
});
