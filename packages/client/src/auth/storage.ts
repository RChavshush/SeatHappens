import { userSchema } from "@cinema/shared";
import type { AuthResponse } from "@cinema/shared";
import type { AuthState } from "./types";

const TOKEN_KEY = "cinema.token";
const USER_KEY = "cinema.user";

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const loadAuth = (): AuthState => {
  const token = getToken();
  const rawUser = localStorage.getItem(USER_KEY);
  if (!token || !rawUser) return { user: null, token: null };

  const parsed = userSchema.safeParse(safeJsonParse(rawUser));
  if (!parsed.success) return { user: null, token: null };

  return { user: parsed.data, token };
};

export const saveAuth = (auth: AuthResponse): void => {
  localStorage.setItem(TOKEN_KEY, auth.token);
  localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
};

export const clearAuth = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

const safeJsonParse = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
