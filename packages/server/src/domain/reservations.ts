import createError from "http-errors";
import { ERROR_CODE, HOLD_STATUS } from "@cinema/shared";
import { prisma } from "../db.js";
import type { ReleaseResult } from "../types.js";

export const cancelReservation = async (
  reservationId: string,
  userId: string,
): Promise<ReleaseResult> =>
  prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findFirst({
      where: { id: reservationId, userId },
      select: { id: true, screeningId: true, holdId: true, seats: { select: { seatId: true } } },
    });
    if (!reservation) {
      throw createError(404, "Reservation not found", {
        code: ERROR_CODE.RESERVATION_NOT_FOUND,
      });
    }

    const releasedSeatIds = reservation.seats.map((s) => s.seatId);
    await tx.reservation.delete({ where: { id: reservation.id } });
    await tx.seatHold.update({
      where: { id: reservation.holdId },
      data: { status: HOLD_STATUS.cancelled },
    });

    return { screeningId: reservation.screeningId, releasedSeatIds };
  });
