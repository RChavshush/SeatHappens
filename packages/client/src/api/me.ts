import { z } from "zod";
import { reservationSummarySchema, userSchema } from "@cinema/shared";
import type { ReservationSummary, User } from "@cinema/shared";
import { apiFetch } from "./client";

const reservationSummaryListSchema = z.array(reservationSummarySchema);

export const getMe = async (): Promise<User> =>
  userSchema.parse(await apiFetch<unknown>("/me"));

export const getMyReservations = async (): Promise<ReservationSummary[]> =>
  reservationSummaryListSchema.parse(await apiFetch<unknown>("/me/reservations"));

export const cancelReservation = async (reservationId: string): Promise<void> => {
  await apiFetch<unknown>(`/reservations/${reservationId}`, { method: "DELETE" });
};
