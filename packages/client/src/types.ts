import type { AUTH_MODE } from "./auth/modes";

export type FieldErrors = Record<string, string>;

export type AuthMode = (typeof AUTH_MODE)[keyof typeof AUTH_MODE];
