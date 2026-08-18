import { createServer } from "node:http";
import { env } from "./env.js";
import { setHoldExpiryScheduler } from "./holdExpiry.js";
import { buildApp } from "./http/app.js";
import {
  makeRedisHoldExpiryScheduler,
  reconcileHoldKeys,
  startExpirySubscriber,
} from "./jobs/expirySubscriber.js";
import { setBroadcaster } from "./realtime/emitter.js";
import { createRealtime, makeBroadcaster } from "./realtime/io.js";
import { closeRedisClients, createRedisClients } from "./redis.js";

const app = buildApp();
const server = createServer(app);
const redis = createRedisClients();

const io = createRealtime(server, { pub: redis.adapterPub, sub: redis.adapterSub });
setBroadcaster(makeBroadcaster(io));
setHoldExpiryScheduler(makeRedisHoldExpiryScheduler(redis.commands));

const stopSubscriber = await startExpirySubscriber(redis.keyspaceSub);
await reconcileHoldKeys(redis.commands);

server.listen(env.SERVER_PORT, () => {
  console.log(`cinema server listening on :${env.SERVER_PORT}`);
});

const shutdown = async (): Promise<void> => {
  stopSubscriber();
  setHoldExpiryScheduler(null);
  setBroadcaster(null);
  await new Promise<void>((resolve) => io.close(() => resolve()));
  await closeRedisClients(redis);
  process.exit(0);
};

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
