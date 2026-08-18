import { describe, expect, it } from "vitest";
import { ApiError } from "../api/errors";
import { shouldRetryQuery } from "./queryClient";

describe("shouldRetryQuery", () => {
  it("never retries an authenticated 401", () => {
    const error = new ApiError(401, "UNAUTHORIZED", "nope");
    expect(shouldRetryQuery(0, error)).toBe(false);
  });

  it("retries a transient error once", () => {
    const error = new Error("network");
    expect(shouldRetryQuery(0, error)).toBe(true);
    expect(shouldRetryQuery(1, error)).toBe(false);
  });

  it("retries a non-401 ApiError once", () => {
    const error = new ApiError(500, "SERVER", "boom");
    expect(shouldRetryQuery(0, error)).toBe(true);
  });
});
