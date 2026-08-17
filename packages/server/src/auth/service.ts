import createError from "http-errors";
import type { AuthResponse, LoginRequest, RegisterRequest } from "@cinema/shared";
import { prisma } from "../db.js";
import type { User as DbUser } from "../generated/prisma/index.js";
import { signToken } from "./jwt.js";
import { hashPassword, verifyPassword } from "./password.js";

const toAuthResponse = (user: DbUser): AuthResponse => ({
  token: signToken({ sub: user.id, email: user.email }),
  user: { id: user.id, email: user.email, displayName: user.displayName },
});

export const register = async (input: RegisterRequest): Promise<AuthResponse> => {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw createError(409, "Email already registered", { code: "EMAIL_TAKEN" });
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { email: input.email, displayName: input.displayName, passwordHash },
  });
  return toAuthResponse(user);
};

export const login = async (input: LoginRequest): Promise<AuthResponse> => {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw createError(401, "Invalid email or password", { code: "INVALID_CREDENTIALS" });
  }
  return toAuthResponse(user);
};
