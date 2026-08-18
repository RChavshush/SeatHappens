import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import { env } from "../env";

export const createSocket = (): Socket =>
  io(env.socketUrl, {
    withCredentials: true,
    autoConnect: false,
    transports: ["websocket"],
  });
