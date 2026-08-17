import { createServer } from "node:http";
import { env } from "./env.js";
import { buildApp } from "./http/app.js";
import { startExpiryJob } from "./jobs/expiry.js";
import { setBroadcaster } from "./realtime/emitter.js";
import { createRealtime, makeBroadcaster } from "./realtime/io.js";

const app = buildApp();
const server = createServer(app);
const io = createRealtime(server);
setBroadcaster(makeBroadcaster(io));
startExpiryJob();

server.listen(env.PORT, () => {
  console.log(`cinema server listening on :${env.PORT}`);
});
