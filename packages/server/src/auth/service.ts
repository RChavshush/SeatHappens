import createError from "http-errors";
import { ERROR_CODE } from "@cinema/shared";
import type { LoginRequest, RegisterRequest } from "@cinema/shared";
import type { AuthResult } from "../types.js";
import { prisma } from "../db.js";
import type { User as DbUser } from "../generated/prisma/index.js";
import { signToken } from "./jwt.js";
import { hashPassword, verifyPassword } from "./password.js";

const toAuthResult = (user: DbUser): AuthResult => ({
  token: signToken({ sub: user.id, email: user.email }),
  user: { id: user.id, email: user.email, displayName: user.displayName },
});

export const register = async (input: RegisterRequest): Promise<AuthResult> => {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw createError(409, "Email already registered", { code: ERROR_CODE.EMAIL_TAKEN });
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { email: input.email, displayName: input.displayName, passwordHash },
  });
  return toAuthResult(user);
};

export const login = async (input: LoginRequest): Promise<AuthResult> => {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw createError(401, "Invalid email or password", { code: ERROR_CODE.INVALID_CREDENTIALS });
  }
  return toAuthResult(user);
};
