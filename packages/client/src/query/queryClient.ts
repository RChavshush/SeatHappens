import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "../api/errors";

const MAX_RETRIES = 1;

export const shouldRetryQuery = (failureCount: number, error: Error): boolean => {
  if (error instanceof ApiError && error.status === 401) return false;
  return failureCount < MAX_RETRIES;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetryQuery,
      refetchOnWindowFocus: false,
      staleTime: 5_000,
    },
  },
});
