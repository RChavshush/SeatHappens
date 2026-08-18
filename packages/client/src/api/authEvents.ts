import type { UnauthorizedHandler } from "./types";

let handler: UnauthorizedHandler | null = null;

export const setUnauthorizedHandler = (next: UnauthorizedHandler | null): void => {
  handler = next;
};

export const notifyUnauthorized = (): void => {
  handler?.();
};
