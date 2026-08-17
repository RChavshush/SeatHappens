import type { Hold, Reservation } from "@cinema/shared";
import { prisma } from "../db.js";

export const getCurrentHold = async (
  userId: string,
  screeningId: string,
): Promise<Hold | null> => {
  const hold = await prisma.seatHold.findFirst({
    where: { userId, screeningId, status: "active", expiresAt: { gt: new Date() } },
    include: { holdSeats: { select: { seatId: true } } },
  });
  if (!hold) return null;
  return {
    id: hold.id,
    screeningId: hold.screeningId,
    seatIds: hold.holdSeats.map((s) => s.seatId),
    expiresAt: hold.expiresAt.toISOString(),
    status: "active",
  };
};

export const listReservations = async (userId: string): Promise<Reservation[]> => {
  const rows = await prisma.reservation.findMany({
    where: { userId },
    orderBy: { confirmedAt: "desc" },
    include: { seats: { select: { seatId: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    screeningId: r.screeningId,
    referenceCode: r.referenceCode,
    seatIds: r.seats.map((s) => s.seatId),
    confirmedAt: r.confirmedAt.toISOString(),
  }));
};
