import { prisma } from "./db.js";
import { Prisma } from "./generated/prisma/index.js";
import type { Tx } from "./types.js";

const MAX_RETRIES = 3;

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

export const runSerializable = async <T>(fn: (tx: Tx) => Promise<T>): Promise<T> => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (isSerializationFailure(error) && attempt < MAX_RETRIES) continue;
      throw error;
    }
  }
};
