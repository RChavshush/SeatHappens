import { HOLD_STATUS, rowLabel } from "@cinema/shared";
import type { Hold, ReservationSummary, User } from "@cinema/shared";
import { prisma } from "../db.js";

export const getMe = async (userId: string): Promise<User> =>
  prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, displayName: true },
  });

export const getCurrentHold = async (
  userId: string,
  screeningId: string,
): Promise<Hold | null> => {
  const hold = await prisma.seatHold.findFirst({
    where: { userId, screeningId, status: HOLD_STATUS.active, expiresAt: { gt: new Date() } },
    include: { holdSeats: { select: { seatId: true } } },
  });
  if (!hold) return null;
  return {
    id: hold.id,
    screeningId: hold.screeningId,
    seatIds: hold.holdSeats.map((s) => s.seatId),
    expiresAt: hold.expiresAt.toISOString(),
    status: HOLD_STATUS.active,
  };
};

export const listReservations = async (userId: string): Promise<ReservationSummary[]> => {
  const rows = await prisma.reservation.findMany({
    where: { userId },
    orderBy: { confirmedAt: "desc" },
    include: {
      screening: { include: { movie: { select: { title: true } } } },
      seats: { select: { seat: { select: { rowIndex: true, seatNumber: true } } } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    screeningId: r.screeningId,
    movieTitle: r.screening.movie.title,
    startsAt: r.screening.startsAt.toISOString(),
    referenceCode: r.referenceCode,
    seatLabels: r.seats
      .map((s) => ({
        rowIndex: s.seat.rowIndex,
        label: `${rowLabel(s.seat.rowIndex)}${s.seat.seatNumber}`,
        seatNumber: s.seat.seatNumber,
      }))
      .sort((a, b) => a.rowIndex - b.rowIndex || a.seatNumber - b.seatNumber)
      .map((s) => s.label),
    confirmedAt: r.confirmedAt.toISOString(),
  }));
};
