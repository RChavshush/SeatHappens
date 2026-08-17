import { errorResponseSchema } from "@cinema/shared";
import { env } from "../env";
import { getToken } from "../auth/storage";
import { ApiError } from "./errors";

export const apiFetch = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${env.apiUrl}${path}`, { ...options, headers });

  if (!response.ok) {
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
