import { createHoldRequestSchema, holdSchema, reservationSchema } from "@cinema/shared";
import type { Hold, Reservation } from "@cinema/shared";
import { apiFetch } from "./client";
import { ApiError } from "./errors";

export const getMyHold = async (): Promise<Hold | null> => {
  try {
    const data = await apiFetch<unknown>("/me/hold");
    return data === null ? null : holdSchema.parse(data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
};

export const createHold = async (
  screeningId: string,
  seatIds: string[],
): Promise<Hold> => {
  const body = createHoldRequestSchema.parse({ seatIds });
  return holdSchema.parse(
    await apiFetch<unknown>(`/screenings/${screeningId}/holds`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
};

export const confirmHold = async (holdId: string): Promise<Reservation> =>
  reservationSchema.parse(
    await apiFetch<unknown>(`/holds/${holdId}/confirm`, { method: "POST" }),
  );

export const releaseHold = async (holdId: string): Promise<void> => {
  await apiFetch<unknown>(`/holds/${holdId}`, { method: "DELETE" });
};
