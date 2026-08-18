import type { Redis } from "ioredis";
import { HOLD_STATUS } from "@cinema/shared";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { holdIdFromKey, holdKey } from "../redis.js";
import { availableDeltas, broadcastSeatUpdates } from "../realtime/emitter.js";
import type { HoldExpiryScheduler } from "../types.js";

const redisDbIndex = (): number => {
  const path = new URL(env.REDIS_URL).pathname.replace(/^\//, "");
  const parsed = Number(path);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
};

const expiredEventChannel = (): string => `__keyevent@${redisDbIndex()}__:expired`;

export const releaseHoldById = async (holdId: string): Promise<void> => {
  const released = await prisma.$queryRaw<{ screeningId: string; seatId: string }[]>`
    DELETE FROM seat_locks WHERE hold_id = ${holdId}
    RETURNING screening_id AS "screeningId", seat_id AS "seatId"`;
  await prisma.$executeRaw`UPDATE seat_holds SET status = ${HOLD_STATUS.expired}::"HoldStatus" WHERE id = ${holdId} AND status = ${HOLD_STATUS.active}::"HoldStatus"`;

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

export const makeRedisHoldExpiryScheduler = (commands: Redis): HoldExpiryScheduler => ({
  schedule: async (holdId, expiresAt) => {
    await commands.set(holdKey(holdId), "", "PXAT", expiresAt.getTime());
  },
  cancel: async (holdId) => {
    await commands.del(holdKey(holdId));
  },
});

export const startExpirySubscriber = async (keyspaceSub: Redis): Promise<() => void> => {
  const channel = expiredEventChannel();
  const onMessage = (chan: string, key: string): void => {
    if (chan !== channel) return;
    const holdId = holdIdFromKey(key);
    if (holdId) {
      void releaseHoldById(holdId).catch((error) =>
        console.error("hold expiry release failed", error),
      );
    }
  };
  keyspaceSub.on("message", onMessage);
  await keyspaceSub.subscribe(channel);
  return () => {
    keyspaceSub.off("message", onMessage);
    void keyspaceSub.unsubscribe(channel);
  };
};

export const reconcileHoldKeys = async (commands: Redis): Promise<void> => {
  const holds = await prisma.seatHold.findMany({
    where: { status: HOLD_STATUS.active },
    select: { id: true, expiresAt: true },
  });
  const now = Date.now();
  for (const hold of holds) {
    const expiresMs = hold.expiresAt.getTime();
    if (expiresMs <= now) {
      await releaseHoldById(hold.id);
    } else {
      await commands.set(holdKey(hold.id), "", "PXAT", expiresMs);
    }
  }
};
