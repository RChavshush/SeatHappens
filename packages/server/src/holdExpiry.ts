import type { HoldExpiryScheduler } from "./types.js";

let scheduler: HoldExpiryScheduler | null = null;

export const setHoldExpiryScheduler = (next: HoldExpiryScheduler | null): void => {
  scheduler = next;
};

export const scheduleHoldExpiry = async (holdId: string, expiresAt: Date): Promise<void> => {
  await scheduler?.schedule(holdId, expiresAt);
};

export const cancelHoldExpiry = async (holdId: string): Promise<void> => {
  await scheduler?.cancel(holdId);
};
