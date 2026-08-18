import { errorResponseSchema } from "@cinema/shared";
import { env } from "../env";
import { notifyUnauthorized } from "./authEvents";
import { ApiError } from "./errors";

export const apiFetch = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");

  const response = await fetch(`${env.apiUrl}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/auth/")) {
      notifyUnauthorized();
    }
    const parsed = errorResponseSchema.safeParse(await readJson(response));
    const code = parsed.success ? parsed.data.code : "UNKNOWN";
    const message = parsed.success ? parsed.data.message : response.statusText;
    throw new ApiError(response.status, code, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
};

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};
