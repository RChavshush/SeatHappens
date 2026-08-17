import createError from "http-errors";
import type { SeatMap, SeatMapRow, SeatSection, SeatState, SeatView } from "@cinema/shared";
import { prisma } from "../db.js";
import type { AuthUserContext } from "../types.js";

export const buildSeatMap = async (
  screeningId: string,
  viewer: AuthUserContext,
): Promise<SeatMap> => {
  const screening = await prisma.screening.findUnique({ where: { id: screeningId } });
  if (!screening) {
    throw createError(404, "Screening not found", { code: "SCREENING_NOT_FOUND" });
  }

  const [seats, reservationSeats, locks] = await Promise.all([
    prisma.seat.findMany({ orderBy: [{ rowIndex: "asc" }, { seatNumber: "asc" }] }),
    prisma.reservationSeat.findMany({ where: { screeningId }, select: { seatId: true } }),
    prisma.seatLock.findMany({
      where: { screeningId, expiresAt: { gt: new Date() } },
      select: { seatId: true, expiresAt: true, hold: { select: { userId: true } } },
    }),
  ]);

  const bookedSeatIds = new Set(reservationSeats.map((r) => r.seatId));
  const lockBySeatId = new Map(locks.map((lock) => [lock.seatId, lock]));

  const rowsByLabel = new Map<string, SeatMapRow>();
  for (const seat of seats) {
    let status: SeatState = "available";
    let heldByMe = false;
    let holdExpiresAt: string | null = null;

    if (bookedSeatIds.has(seat.id)) {
      status = "booked";
    } else {
      const lock = lockBySeatId.get(seat.id);
      if (lock) {
        status = "held";
        heldByMe = lock.hold.userId === viewer.id;
        holdExpiresAt = lock.expiresAt.toISOString();
      }
    }

    const view: SeatView = {
      id: seat.id,
      rowLabel: seat.rowLabel,
      seatNumber: seat.seatNumber,
      section: seat.section as SeatSection,
      status,
      heldByMe,
      holdExpiresAt,
    };

    let row = rowsByLabel.get(seat.rowLabel);
    if (!row) {
      row = { rowLabel: seat.rowLabel, section: seat.section as SeatSection, seats: [] };
      rowsByLabel.set(seat.rowLabel, row);
    }
    row.seats.push(view);
  }

  return { screeningId, rows: [...rowsByLabel.values()] };
};
