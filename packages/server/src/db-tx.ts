import createError from "http-errors";
import { ERROR_CODE } from "@cinema/shared";
import { prisma } from "./db.js";
import { Prisma } from "./generated/prisma/index.js";
import type { Tx } from "./types.js";

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 20;
const MAX_BACKOFF_MS = 200;

export const isSerializationFailure = (error: unknown): boolean => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2034") return true;
    const meta = error.meta as { code?: string } | undefined;
    if (meta?.code === "40001") return true;
  }
  return false;
};

export const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const backoffDelay = (attempt: number): number => {
  const ceiling = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** attempt);
  return Math.random() * ceiling;
};

export const runSerializable = async <T>(fn: (tx: Tx) => Promise<T>): Promise<T> => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (!isSerializationFailure(error)) throw error;
      if (attempt >= MAX_RETRIES) {
        throw createError(503, "Seats are in high demand right now - try again", {
          code: ERROR_CODE.SEAT_CONTENTION,
        });
      }
      await sleep(backoffDelay(attempt));
    }
  }
};
