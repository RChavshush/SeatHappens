import { z } from "zod";
import { createScreeningRequestSchema, screeningSchema, seatMapSchema } from "@cinema/shared";
import type { CreateScreeningRequest, Screening, SeatMap } from "@cinema/shared";
import { apiFetch } from "./client";

export const listScreenings = async (): Promise<Screening[]> =>
  z.array(screeningSchema).parse(await apiFetch<unknown>("/screenings"));

export const createScreening = async (input: CreateScreeningRequest): Promise<Screening> => {
  const body = createScreeningRequestSchema.parse(input);
  return screeningSchema.parse(
    await apiFetch<unknown>("/screenings", { method: "POST", body: JSON.stringify(body) }),
  );
};

export const getSeatMap = async (screeningId: string): Promise<SeatMap> =>
  seatMapSchema.parse(await apiFetch<unknown>(`/screenings/${screeningId}/seatmap`));
