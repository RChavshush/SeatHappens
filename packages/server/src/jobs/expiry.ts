import { prisma } from "../db.js";
import { availableDeltas, broadcastSeatUpdates } from "../realtime/emitter.js";

const EXPIRY_INTERVAL_MS = 10_000;

export const runExpirySweep = async (): Promise<void> => {
  const released = await prisma.$queryRaw<{ screeningId: string; seatId: string }[]>`
    DELETE FROM seat_locks WHERE expires_at <= now()
    RETURNING screening_id AS "screeningId", seat_id AS "seatId"`;
  await prisma.$executeRaw`UPDATE seat_holds SET status = 'expired' WHERE status = 'active' AND expires_at <= now()`;

  if (released.length === 0) return;

  const seatIdsByScreening = new Map<string, string[]>();
  for (const { screeningId, seatId } of released) {
    const list = seatIdsByScreening.get(screeningId) ?? [];
    list.push(seatId);
    seatIdsByScreening.set(screeningId, list);
  }
  for (const [screeningId, seatIds] of seatIdsByScreening) {
    broadcastSeatUpdates(screeningId, availableDeltas(seatIds));
  }
};

export const startExpiryJob = (intervalMs = EXPIRY_INTERVAL_MS): (() => void) => {
  const timer = setInterval(() => {
    runExpirySweep().catch((error) => console.error("expiry sweep failed", error));
  }, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
};
