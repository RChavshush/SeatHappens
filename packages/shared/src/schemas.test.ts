import { describe, expect, it } from "vitest";
import { createHoldRequestSchema } from "./schemas.js";

describe("createHoldRequestSchema", () => {
  it("accepts more than 10 seats (no upper cap)", () => {
    const seatIds = Array.from({ length: 15 }, (_, i) => `seat-${i}`);
    expect(createHoldRequestSchema.safeParse({ seatIds }).success).toBe(true);
  });

  it("requires at least one seat", () => {
    expect(createHoldRequestSchema.safeParse({ seatIds: [] }).success).toBe(false);
  });
});
