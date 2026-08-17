import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import { env } from "../env";

export const createSocket = (token: string): Socket =>
  io(env.socketUrl, {
    auth: { token },
    autoConnect: false,
    transports: ["websocket"],
  });
