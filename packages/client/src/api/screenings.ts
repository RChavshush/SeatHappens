import { z } from "zod";
import { screeningSchema, seatMapSchema } from "@cinema/shared";
import type { Screening, SeatMap } from "@cinema/shared";
import { apiFetch } from "./client";

export const listScreenings = async (): Promise<Screening[]> =>
  z.array(screeningSchema).parse(await apiFetch<unknown>("/screenings"));

export const getSeatMap = async (screeningId: string): Promise<SeatMap> =>
  seatMapSchema.parse(await apiFetch<unknown>(`/screenings/${screeningId}/seatmap`));
