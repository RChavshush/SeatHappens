import { describe, expect, it } from "vitest";
import { HOLD_STATUS } from "@cinema/shared";
import type { Hold } from "@cinema/shared";
import { reconcileHold } from "./reconcile";

const holdWith = (seatIds: string[]): Hold => ({
  id: "hold-1",
  screeningId: "s1",
  seatIds,
  expiresAt: "2026-08-18T12:00:00.000Z",
  status: HOLD_STATUS.active,
});

describe("reconcileHold", () => {
  it("does nothing when there is no selection and no hold", () => {
    expect(reconcileHold([], null)).toEqual({ kind: "none" });
  });

  it("releases the hold when the selection becomes empty", () => {
    expect(reconcileHold([], holdWith(["A1", "A2"]))).toEqual({
      kind: "release",
      holdId: "hold-1",
    });
  });

  it("creates a hold when seats are selected and none exists", () => {
    expect(reconcileHold(["A1", "A2"], null)).toEqual({
      kind: "create",
      seatIds: ["A1", "A2"],
    });
  });

  it("does nothing when the selection already matches the hold", () => {
    expect(reconcileHold(["A1", "A2"], holdWith(["A1", "A2"]))).toEqual({
      kind: "none",
    });
  });

  it("ignores seat order when comparing selection to the hold", () => {
    expect(reconcileHold(["A2", "A1"], holdWith(["A1", "A2"]))).toEqual({
      kind: "none",
    });
  });

  it("replaces the hold when the selection changes", () => {
    expect(reconcileHold(["A1", "A2", "A3"], holdWith(["A1", "A2"]))).toEqual({
      kind: "create",
      seatIds: ["A1", "A2", "A3"],
    });
  });

  it("replaces the hold when the selection moves to different seats", () => {
    expect(reconcileHold(["B1"], holdWith(["A1"]))).toEqual({
      kind: "create",
      seatIds: ["B1"],
    });
  });
});
