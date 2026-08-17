import { z } from "zod";

export const idParamsSchema = z.object({ id: z.string().min(1) });

export const screeningIdQuerySchema = z.object({ screeningId: z.string().min(1) });
