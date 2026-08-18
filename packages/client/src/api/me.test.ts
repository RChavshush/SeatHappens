import { afterEach, describe, expect, it, vi } from "vitest";
import { cancelReservation, getMe, getMyReservations } from "./me";

const jsonResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    json: async () => body,
  }) as Response;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("getMe", () => {
  it("fetches and parses the current user", async () => {
    const user = { id: "u1", email: "a@b.co", displayName: "Ada" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, user)));

    const result = await getMe();

    expect(result).toEqual(user);
    const [path, options] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(path)).toContain("/me");
    expect((options as RequestInit).credentials).toBe("include");
  });
});

describe("getMyReservations", () => {
  it("fetches and parses reservation summaries", async () => {
    const summaries = [
      {
        id: "r1",
        screeningId: "sc1",
        movieTitle: "Dune",
        startsAt: "2026-08-18T20:00:00.000Z",
        referenceCode: "RSV-ABCD1234",
        seatLabels: ["A1", "A2"],
        confirmedAt: "2026-08-18T19:00:00.000Z",
      },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, summaries)));

    const result = await getMyReservations();

    expect(result).toEqual(summaries);
    expect(String(vi.mocked(fetch).mock.calls[0]![0])).toContain("/me/reservations");
  });
});

describe("cancelReservation", () => {
  it("sends a DELETE to the reservation endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(204, null)));

    await cancelReservation("r1");

    const [path, options] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(path)).toContain("/reservations/r1");
    expect((options as RequestInit).method).toBe("DELETE");
  });
});
