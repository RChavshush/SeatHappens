import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { AuthResponse } from "@cinema/shared";
import { setUnauthorizedHandler } from "../api/authEvents";
import type { AuthContextValue, AuthState } from "./types";
import { clearAuth, loadAuth, saveAuth } from "./storage";

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>(loadAuth);

  const signIn = useCallback((auth: AuthResponse) => {
    saveAuth(auth);
    setState({ user: auth.user, token: auth.token });
  }, []);

  const signOut = useCallback(() => {
    clearAuth();
    setState({ user: null, token: null });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signIn, signOut }),
    [state, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
