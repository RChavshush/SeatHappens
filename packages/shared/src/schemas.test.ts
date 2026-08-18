import { describe, expect, it } from "vitest";
import {
  createHoldRequestSchema,
  reservationSummarySchema,
  seatViewSchema,
} from "./schemas.js";

describe("createHoldRequestSchema", () => {
  it("accepts more than 10 seats (no upper cap)", () => {
    const seatIds = Array.from({ length: 15 }, (_, i) => `seat-${i}`);
    expect(createHoldRequestSchema.safeParse({ seatIds }).success).toBe(true);
  });

  it("requires at least one seat", () => {
    expect(createHoldRequestSchema.safeParse({ seatIds: [] }).success).toBe(false);
  });
});

describe("seatViewSchema", () => {
  it("requires bookedByMe", () => {
    const base = {
      id: "s1",
      rowLabel: "A",
      seatNumber: 1,
      status: "booked",
      heldByMe: false,
      holdExpiresAt: null,
    };
    expect(seatViewSchema.safeParse(base).success).toBe(false);
    expect(seatViewSchema.safeParse({ ...base, bookedByMe: true }).success).toBe(true);
  });
});

describe("reservationSummarySchema", () => {
  it("parses an enriched reservation", () => {
    const parsed = reservationSummarySchema.safeParse({
      id: "r1",
      screeningId: "sc1",
      movieTitle: "Dune",
      startsAt: "2026-08-18T20:00:00.000Z",
      referenceCode: "RSV-ABCD1234",
      seatLabels: ["A1", "A2"],
      confirmedAt: "2026-08-18T19:00:00.000Z",
    });
    expect(parsed.success).toBe(true);
  });
});
