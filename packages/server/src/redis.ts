import { Redis } from "ioredis";
import { env } from "./env.js";
import type { RedisClients } from "./types.js";

const HOLD_KEY_PREFIX = "hold:";

export const holdKey = (holdId: string): string => `${HOLD_KEY_PREFIX}${holdId}`;

export const holdIdFromKey = (key: string): string | null =>
  key.startsWith(HOLD_KEY_PREFIX) ? key.slice(HOLD_KEY_PREFIX.length) : null;

export const createRedisClients = (): RedisClients => {
  const commands = new Redis(env.REDIS_URL, { lazyConnect: false });
  return {
    commands,
    adapterPub: commands.duplicate(),
    adapterSub: commands.duplicate(),
    keyspaceSub: commands.duplicate(),
  };
};

export const closeRedisClients = async (clients: RedisClients): Promise<void> => {
  await Promise.all(Object.values(clients).map((client) => client.quit()));
};
