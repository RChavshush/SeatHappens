import { authResponseSchema } from "@cinema/shared";
import type { AuthResponse, LoginRequest, RegisterRequest } from "@cinema/shared";
import { apiFetch } from "./client";

export const login = async (body: LoginRequest): Promise<AuthResponse> =>
  authResponseSchema.parse(
    await apiFetch<unknown>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

export const register = async (body: RegisterRequest): Promise<AuthResponse> =>
  authResponseSchema.parse(
    await apiFetch<unknown>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
