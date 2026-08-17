import type { ZodError } from "zod";
import type { FieldErrors } from "../types";

export const fieldErrors = (error: ZodError): FieldErrors => {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !result[key]) result[key] = issue.message;
  }
  return result;
};
