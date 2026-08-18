import createError from "http-errors";
import { ERROR_CODE, SEAT_STATE, rowLabel } from "@cinema/shared";
import type { SeatMap, SeatMapRow, SeatState, SeatView } from "@cinema/shared";
import { prisma } from "../db.js";
import type { AuthUserContext } from "../types.js";

export const buildSeatMap = async (
  screeningId: string,
  viewer: AuthUserContext,
): Promise<SeatMap> => {
  const screening = await prisma.screening.findUnique({ where: { id: screeningId } });
  if (!screening) {
    throw createError(404, "Screening not found", { code: ERROR_CODE.SCREENING_NOT_FOUND });
  }

  const [seats, reservationSeats, locks] = await Promise.all([
    prisma.seat.findMany({ orderBy: [{ rowIndex: "asc" }, { seatNumber: "asc" }] }),
    prisma.reservationSeat.findMany({
      where: { screeningId },
      select: { seatId: true, reservation: { select: { userId: true } } },
    }),
    prisma.seatLock.findMany({
      where: { screeningId, expiresAt: { gt: new Date() } },
      select: { seatId: true, expiresAt: true, hold: { select: { userId: true } } },
    }),
  ]);

  const bookedSeatIds = new Set(reservationSeats.map((r) => r.seatId));
  const mineBookedSeatIds = new Set(
    reservationSeats.filter((r) => r.reservation.userId === viewer.id).map((r) => r.seatId),
  );
  const lockBySeatId = new Map(locks.map((lock) => [lock.seatId, lock]));

  const rowsByIndex = new Map<number, SeatMapRow>();
  for (const seat of seats) {
    const label = rowLabel(seat.rowIndex);
    let status: SeatState = SEAT_STATE.available;
    let heldByMe = false;
    let bookedByMe = false;
    let holdExpiresAt: string | null = null;

    if (bookedSeatIds.has(seat.id)) {
      status = SEAT_STATE.booked;
      bookedByMe = mineBookedSeatIds.has(seat.id);
    } else {
      const lock = lockBySeatId.get(seat.id);
      if (lock) {
        status = SEAT_STATE.held;
        heldByMe = lock.hold.userId === viewer.id;
        holdExpiresAt = lock.expiresAt.toISOString();
      }
    }

    const view: SeatView = {
      id: seat.id,
      rowLabel: label,
      seatNumber: seat.seatNumber,
      status,
      heldByMe,
      bookedByMe,
      holdExpiresAt,
    };

    let row = rowsByIndex.get(seat.rowIndex);
    if (!row) {
      row = { rowLabel: label, seats: [] };
      rowsByIndex.set(seat.rowIndex, row);
    }
    row.seats.push(view);
  }

  return { screeningId, rows: [...rowsByIndex.values()] };
};
