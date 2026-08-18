import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import type { SeatsUpdatedEvent } from "@cinema/shared";
import { AUTH_COOKIE_NAME } from "../auth/cookie.js";
import { verifyToken } from "../auth/jwt.js";
import { env } from "../env.js";
import type { SeatBroadcaster, SocketData } from "../types.js";

const roomFor = (screeningId: string): string => `screening:${screeningId}`;

const readCookie = (header: string | undefined, name: string): string | null => {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
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
  >(server, { cors: { origin: env.CLIENT_ORIGIN, credentials: true } });

  io.use((socket, next) => {
    const token = readCookie(socket.handshake.headers.cookie, AUTH_COOKIE_NAME);
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
