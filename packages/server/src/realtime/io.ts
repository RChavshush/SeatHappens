import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import type { SeatsUpdatedEvent } from "@cinema/shared";
import { verifyToken } from "../auth/jwt.js";
import { env } from "../env.js";
import type { SeatBroadcaster, SocketData } from "../types.js";

const roomFor = (screeningId: string): string => `screening:${screeningId}`;

const extractToken = (auth: unknown, header: string | undefined): string | null => {
  const fromAuth = (auth as { token?: unknown } | undefined)?.token;
  if (typeof fromAuth === "string") return fromAuth;
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length);
  return null;
};

export const createRealtime = (
  server: HttpServer,
): Server<Record<string, never>, Record<string, never>, Record<string, never>, SocketData> => {
  const io = new Server<
    Record<string, never>,
    Record<string, never>,
    Record<string, never>,
    SocketData
  >(server, { cors: { origin: env.CLIENT_ORIGIN } });

  io.use((socket, next) => {
    const token = extractToken(socket.handshake.auth, socket.handshake.headers.authorization);
    if (!token) {
      next(new Error("unauthorized"));
      return;
    }
    try {
      const payload = verifyToken(token);
      socket.data.user = { id: payload.sub, email: payload.email };
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const initial = (socket.handshake.auth as { screeningId?: unknown }).screeningId;
    if (typeof initial === "string") socket.join(roomFor(initial));

    socket.on("screening:subscribe", (payload: unknown, ack?: () => void) => {
      const screeningId = (payload as { screeningId?: unknown })?.screeningId;
      if (typeof screeningId === "string") socket.join(roomFor(screeningId));
      ack?.();
    });
    socket.on("screening:unsubscribe", (payload: unknown, ack?: () => void) => {
      const screeningId = (payload as { screeningId?: unknown })?.screeningId;
      if (typeof screeningId === "string") socket.leave(roomFor(screeningId));
      ack?.();
    });
  });

  return io;
};

export const makeBroadcaster =
  (io: Server<Record<string, never>, Record<string, never>, Record<string, never>, SocketData>): SeatBroadcaster =>
  (screeningId, seats) => {
    const event: SeatsUpdatedEvent = { screeningId, seats };
    io.to(roomFor(screeningId)).emit("seats:updated", event);
  };
