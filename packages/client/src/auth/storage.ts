import { userSchema } from "@cinema/shared";
import type { AuthResponse } from "@cinema/shared";
import type { AuthState } from "./types";

const USER_KEY = "cinema.user";

export const loadAuth = (): AuthState => {
  const rawUser = localStorage.getItem(USER_KEY);
  if (!rawUser) return { user: null };

  const parsed = userSchema.safeParse(safeJsonParse(rawUser));
  if (!parsed.success) return { user: null };

  return { user: parsed.data };
};

export const saveAuth = (auth: AuthResponse): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
};

export const clearAuth = (): void => {
  localStorage.removeItem(USER_KEY);
};

const safeJsonParse = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
