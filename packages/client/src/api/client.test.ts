import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getToken } from "../auth/storage";
import { apiFetch } from "./client";
import { ApiError } from "./errors";
import { setUnauthorizedHandler } from "./authEvents";

vi.mock("../auth/storage", () => ({ getToken: vi.fn() }));

const mockToken = (token: string | null) =>
  vi.mocked(getToken).mockReturnValue(token);

const jsonResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    json: async () => body,
  }) as Response;

describe("apiFetch unauthorized handling", () => {
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

  const stubFetch = (response: Response) =>
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

  it("notifies on a 401 for an authenticated protected request", async () => {
    mockToken("expired");
    stubFetch(jsonResponse(401, { code: "UNAUTHORIZED", message: "nope" }));

    await expect(apiFetch("/screenings")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("does not notify on a 401 from an /auth/* route", async () => {
    mockToken("expired");
    stubFetch(jsonResponse(401, { code: "INVALID_CREDENTIALS", message: "bad" }));

    await expect(
      apiFetch("/auth/login", { method: "POST", body: "{}" }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("does not notify on a 401 when no token is stored", async () => {
    mockToken(null);
    stubFetch(jsonResponse(401, { code: "UNAUTHORIZED", message: "nope" }));

    await expect(apiFetch("/screenings")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("does not notify on non-401 failures", async () => {
    mockToken("ok");
    stubFetch(jsonResponse(404, { code: "NOT_FOUND", message: "gone" }));

    await expect(apiFetch("/screenings")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
