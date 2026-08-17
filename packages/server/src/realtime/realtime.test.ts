import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import request from "supertest";
import { io as ioClient, type Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../db.js";
import { buildApp } from "../http/app.js";
import { setBroadcaster } from "./emitter.js";
import { createRealtime, makeBroadcaster } from "./io.js";
import type { SeatsUpdatedEvent } from "@cinema/shared";
import {
  SEED_SCREENING_ID,
  deleteUsers,
  registerUser,
  resetScreeningState,
  seatIdsForRow,
} from "../testing/support.js";
import type { TestUser } from "../testing/support.js";

const app = buildApp();
let httpServer: HttpServer;
let url: string;
let user: TestUser;

const waitForConnect = (socket: Socket): Promise<void> =>
  new Promise((resolve, reject) => {
    socket.on("connect", () => resolve());
    socket.on("connect_error", reject);
  });

beforeAll(async () => {
  await resetScreeningState(SEED_SCREENING_ID);
  user = await registerUser(app, "socket");

  httpServer = createServer(app);
  const server = createRealtime(httpServer);
  setBroadcaster(makeBroadcaster(server));
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const port = (httpServer.address() as AddressInfo).port;
  url = `http://localhost:${port}`;
});

afterAll(async () => {
  setBroadcaster(null);
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  await resetScreeningState(SEED_SCREENING_ID);
  await deleteUsers([user.email]);
  await prisma.$disconnect();
});

describe("realtime", () => {
  it("rejects a handshake without a token", async () => {
    const socket = ioClient(url, { transports: ["websocket"], reconnection: false });
    await expect(waitForConnect(socket)).rejects.toThrow();
    socket.close();
  });

  it("broadcasts seats:updated to subscribers of a screening when a hold is created", async () => {
    const socket = ioClient(url, {
      transports: ["websocket"],
      reconnection: false,
      auth: { token: user.token, screeningId: SEED_SCREENING_ID },
    });
    await waitForConnect(socket);

    const seat = (await seatIdsForRow("L"))[0]!;
    const event = new Promise<SeatsUpdatedEvent>((resolve) => {
      socket.on("seats:updated", resolve);
    });

    const res = await request(app)
      .post(`/screenings/${SEED_SCREENING_ID}/holds`)
      .auth(user.token, { type: "bearer" })
      .send({ seatIds: [seat] });
    expect(res.status).toBe(201);

    const payload = await event;
    expect(payload.screeningId).toBe(SEED_SCREENING_ID);
    expect(payload.seats).toContainEqual(
      expect.objectContaining({ id: seat, status: "held" }),
    );
    socket.close();
  });
});
