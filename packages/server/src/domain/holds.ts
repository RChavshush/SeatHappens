import { randomUUID } from "node:crypto";
import createError from "http-errors";
import type { HttpError } from "http-errors";
import { validateSelection } from "@cinema/shared";
import type { Reservation, RuleErrorCode, SeatState } from "@cinema/shared";
import { prisma } from "../db.js";
import { runSerializable, isUniqueViolation } from "../db-tx.js";
import { env } from "../env.js";
import type { ConfirmResult, HoldMutationResult, ReleaseResult, Tx } from "../types.js";

const mapRuleError = (code: RuleErrorCode, message: string): HttpError => {
  switch (code) {
    case "SEAT_UNAVAILABLE":
      return createError(409, message, { code });
    case "NOT_CONSECUTIVE":
    case "ISOLATED_SEAT":
      return createError(422, message, { code });
    default:
      return createError(422, message, { code: "VALIDATION_FAILED" });
  }
};

const sweepExpired = async (tx: Tx, screeningId: string): Promise<void> => {
  await tx.$executeRaw`DELETE FROM seat_locks WHERE screening_id = ${screeningId} AND expires_at <= now()`;
  await tx.$executeRaw`UPDATE seat_holds SET status = 'expired' WHERE screening_id = ${screeningId} AND status = 'active' AND expires_at <= now()`;
};

export const createHold = async (
  screeningId: string,
  userId: string,
  seatIds: string[],
): Promise<HoldMutationResult> =>
  runSerializable(async (tx) => {
    const clock = await tx.$queryRaw<{ now: Date; expiresAt: Date }[]>`
      SELECT now() AS "now",
             now() + (${env.HOLD_DURATION_MINUTES}::int * interval '1 minute') AS "expiresAt"`;
    const { now: dbNow, expiresAt } = clock[0]!;

    await sweepExpired(tx, screeningId);

    const releasedSeatIds: string[] = [];
    const own = await tx.seatHold.findFirst({
      where: { screeningId, userId, status: "active", expiresAt: { gt: dbNow } },
      select: { id: true },
    });
    if (own) {
      const ownLocks = await tx.seatLock.findMany({
        where: { holdId: own.id },
        select: { seatId: true },
      });
      releasedSeatIds.push(...ownLocks.map((l) => l.seatId));
      await tx.seatLock.deleteMany({ where: { holdId: own.id } });
      await tx.seatHold.update({ where: { id: own.id }, data: { status: "cancelled" } });
    }

    const selected = await tx.seat.findMany({
      where: { id: { in: seatIds } },
      select: { id: true, rowLabel: true },
    });
    if (selected.length !== new Set(seatIds).size) {
      throw createError(422, "One or more seats do not exist", { code: "VALIDATION_FAILED" });
    }
    if (new Set(selected.map((s) => s.rowLabel)).size > 1) {
      throw createError(422, "Selected seats must be in the same row", {
        code: "NOT_CONSECUTIVE",
      });
    }
    const rowLabel = selected[0]!.rowLabel;

    const rowSeats = await tx.seat.findMany({
      where: { rowLabel },
      orderBy: { seatNumber: "asc" },
      select: { id: true },
    });
    const rowSeatIds = rowSeats.map((s) => s.id);
    const [booked, locked] = await Promise.all([
      tx.reservationSeat.findMany({
        where: { screeningId, seatId: { in: rowSeatIds } },
        select: { seatId: true },
      }),
      tx.seatLock.findMany({
        where: { screeningId, seatId: { in: rowSeatIds }, expiresAt: { gt: dbNow } },
        select: { seatId: true },
      }),
    ]);
    const bookedSet = new Set(booked.map((b) => b.seatId));
    const lockedSet = new Set(locked.map((l) => l.seatId));

    const rowStates: SeatState[] = rowSeats.map((s) =>
      bookedSet.has(s.id) ? "booked" : lockedSet.has(s.id) ? "held" : "available",
    );
    const positionById = new Map(rowSeats.map((s, i) => [s.id, i]));
    const selection = seatIds.map((id) => positionById.get(id)!);

    const result = validateSelection(rowStates, selection);
    if (!result.ok) throw mapRuleError(result.code, result.message);

    try {
      const hold = await tx.seatHold.create({
        data: { screeningId, userId, status: "active", expiresAt },
      });
      await tx.seatHoldSeat.createMany({
        data: seatIds.map((seatId) => ({ holdId: hold.id, seatId, screeningId })),
      });
      await tx.seatLock.createMany({
        data: seatIds.map((seatId) => ({ screeningId, seatId, holdId: hold.id, expiresAt })),
      });
      return {
        hold: {
          id: hold.id,
          screeningId,
          seatIds,
          expiresAt: expiresAt.toISOString(),
          status: "active",
        },
        heldSeatIds: seatIds,
        releasedSeatIds,
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw createError(409, "One or more seats were just taken", {
          code: "SEAT_UNAVAILABLE",
        });
      }
      throw error;
    }
  });

const loadReservation = async (
  tx: Tx,
  holdId: string,
): Promise<{ reservation: Reservation; seatIds: string[] } | null> => {
  const row = await tx.reservation.findUnique({
    where: { holdId },
    include: { seats: { select: { seatId: true } } },
  });
  if (!row) return null;
  const seatIds = row.seats.map((s) => s.seatId);
  return {
    reservation: {
      id: row.id,
      screeningId: row.screeningId,
      referenceCode: row.referenceCode,
      seatIds,
      confirmedAt: row.confirmedAt.toISOString(),
    },
    seatIds,
  };
};

export const confirmHold = async (holdId: string, userId: string): Promise<ConfirmResult> =>
  prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      { screeningId: string; status: string; expired: boolean }[]
    >`
      SELECT screening_id AS "screeningId", status::text AS status, (expires_at <= now()) AS expired
      FROM seat_holds WHERE id = ${holdId} AND user_id = ${userId} FOR UPDATE`;
    const hold = rows[0];
    if (!hold) throw createError(404, "Hold not found", { code: "HOLD_NOT_FOUND" });

    if (hold.status === "confirmed") {
      const existing = await loadReservation(tx, holdId);
      return { reservation: existing!.reservation, bookedSeatIds: [], screeningId: hold.screeningId };
    }

    await sweepExpired(tx, hold.screeningId);

    if (hold.status !== "active" || hold.expired) {
      throw createError(410, "Hold has expired", { code: "HOLD_EXPIRED" });
    }

    const holdSeats = await tx.seatHoldSeat.findMany({
      where: { holdId },
      select: { seatId: true },
    });
    const seatIds = holdSeats.map((s) => s.seatId);

    try {
      const reservation = await tx.reservation.create({
        data: {
          screeningId: hold.screeningId,
          userId,
          holdId,
          referenceCode: `RSV-${randomUUID().slice(0, 8).toUpperCase()}`,
        },
      });
      await tx.reservationSeat.createMany({
        data: seatIds.map((seatId) => ({
          reservationId: reservation.id,
          seatId,
          screeningId: hold.screeningId,
        })),
      });
      await tx.seatHold.update({ where: { id: holdId }, data: { status: "confirmed" } });
      await tx.seatLock.deleteMany({ where: { holdId } });

      return {
        reservation: {
          id: reservation.id,
          screeningId: hold.screeningId,
          referenceCode: reservation.referenceCode,
          seatIds,
          confirmedAt: reservation.confirmedAt.toISOString(),
        },
        bookedSeatIds: seatIds,
        screeningId: hold.screeningId,
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw createError(409, "One or more seats were just booked", {
          code: "SEAT_UNAVAILABLE",
        });
      }
      throw error;
    }
  });

export const releaseHold = async (holdId: string, userId: string): Promise<ReleaseResult> =>
  prisma.$transaction(async (tx) => {
    const hold = await tx.seatHold.findFirst({
      where: { id: holdId, userId },
      select: { id: true, screeningId: true, status: true },
    });
    if (!hold) throw createError(404, "Hold not found", { code: "HOLD_NOT_FOUND" });

    if (hold.status === "confirmed") {
      throw createError(409, "Cannot release a confirmed reservation", {
        code: "HOLD_ALREADY_CONFIRMED",
      });
    }

    if (hold.status !== "active") {
      return { screeningId: hold.screeningId, releasedSeatIds: [] };
    }

    const locks = await tx.seatLock.findMany({
      where: { holdId },
      select: { seatId: true },
    });
    await tx.seatLock.deleteMany({ where: { holdId } });
    await tx.seatHold.update({ where: { id: holdId }, data: { status: "cancelled" } });

    return { screeningId: hold.screeningId, releasedSeatIds: locks.map((l) => l.seatId) };
  });
