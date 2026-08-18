import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthResponse } from "@cinema/shared";
import { logout } from "../api/auth";
import { getMe } from "../api/me";
import { queryKeys } from "../query/keys";
import type { Auth } from "./types";

export const useAuth = (): Auth => {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: getMe,
    retry: false,
    staleTime: Infinity,
  });

  const signIn = useCallback(
    (auth: AuthResponse) => {
      queryClient.setQueryData(queryKeys.currentUser, auth.user);
    },
    [queryClient],
  );

  const signOut = useCallback(() => {
    void logout().catch(() => {});
    queryClient.setQueryData(queryKeys.currentUser, null);
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] !== queryKeys.currentUser[0],
    });
  }, [queryClient]);

  return {
    user: meQuery.data ?? null,
    isLoading: meQuery.isPending,
    signIn,
    signOut,
  };
};
