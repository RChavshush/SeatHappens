import { afterEach, describe, expect, it, vi } from "vitest";
import { getMe } from "./me";

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
