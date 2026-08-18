import { userSchema } from "@cinema/shared";
import type { User } from "@cinema/shared";
import { apiFetch } from "./client";

export const getMe = async (): Promise<User> =>
  userSchema.parse(await apiFetch<unknown>("/me"));
