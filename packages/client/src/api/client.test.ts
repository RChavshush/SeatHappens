import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./client";
import { ApiError } from "./errors";
import { setUnauthorizedHandler } from "./authEvents";

const jsonResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    json: async () => body,
  }) as Response;

describe("apiFetch", () => {
  let onUnauthorized: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
  });

  afterEach(() => {
    setUnauthorizedHandler(null);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const stubFetch = (response: Response) => {
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  };

  it("sends credentials and no Authorization header", async () => {
    const fetchMock = stubFetch(jsonResponse(200, { ok: true }));
    await apiFetch("/screenings");
    const [, options] = fetchMock.mock.calls[0]!;
    expect(options.credentials).toBe("include");
    expect(new Headers(options.headers).has("Authorization")).toBe(false);
  });

  it("notifies on a 401 for a protected request", async () => {
    stubFetch(jsonResponse(401, { code: "UNAUTHORIZED", message: "nope" }));
    await expect(apiFetch("/screenings")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("does not notify on a 401 from an /auth/* route", async () => {
    stubFetch(jsonResponse(401, { code: "INVALID_CREDENTIALS", message: "bad" }));
    await expect(
      apiFetch("/auth/login", { method: "POST", body: "{}" }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("does not notify on non-401 failures", async () => {
    stubFetch(jsonResponse(404, { code: "NOT_FOUND", message: "gone" }));
    await expect(apiFetch("/screenings")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("does not notify on a 401 from the /me identity probe", async () => {
    stubFetch(jsonResponse(401, { code: "UNAUTHENTICATED", message: "nope" }));
    await expect(apiFetch("/me")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("still notifies on a 401 from a nested /me sub-resource", async () => {
    stubFetch(jsonResponse(401, { code: "UNAUTHENTICATED", message: "nope" }));
    await expect(apiFetch("/me/hold?screeningId=x")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
